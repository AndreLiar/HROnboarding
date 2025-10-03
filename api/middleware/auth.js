const rateLimit = require('express-rate-limit');
const AuthService = require('../services/AuthService');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided or invalid format',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const { user, session } = await AuthService.verifyToken(token);

    // Attach user and session to request object
    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      details: error.message,
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { user, session } = await AuthService.verifyToken(token);
      req.user = user;
      req.session = session;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied. Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin');

// HR Manager and Admin middleware
const hrManagerOrAdmin = authorize('hr_manager', 'admin');

// All authenticated users middleware
const authenticatedOnly = authorize('employee', 'hr_manager', 'admin');

// Self or admin middleware (user can only access their own data or admin can access all)
const selfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied. Authentication required',
    });
  }

  const requestedUserId = req.params.userId || req.params.id;
  const isOwner = req.user.id === requestedUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      error: 'Access denied. You can only access your own data',
    });
  }

  next();
};

// Middleware to extract IP address and User Agent
const extractClientInfo = (req, res, next) => {
  req.clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
  };
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

// Validate session middleware (checks if session is still active)
const validateSession = async (req, res, next) => {
  try {
    if (!req.session) {
      return next();
    }

    // Check if session is still active in database
    const { poolPromise } = require('../config/database');
    const pool = await poolPromise;

    const sessionResult = await pool.request().input('session_id', req.session.id).query(`
        SELECT is_active, expires_at 
        FROM UserSessions 
        WHERE id = @session_id
      `);

    const session = sessionResult.recordset[0];

    if (!session || !session.is_active || new Date() > new Date(session.expires_at)) {
      return res.status(401).json({
        error: 'Session expired or invalid',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Session validation failed',
      details: error.message,
    });
  }
};

module.exports = {
  authLimiter,
  generalLimiter,
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  hrManagerOrAdmin,
  authenticatedOnly,
  selfOrAdmin,
  extractClientInfo,
  securityHeaders,
  validateSession,
};
