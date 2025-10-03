const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const { authLimiter, authenticate, extractClientInfo, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['employee', 'hr_manager', 'admin'])
    .withMessage('Role must be one of: employee, hr_manager, admin'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [employee, hr_manager, admin]
 *                 default: employee
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', authLimiter, extractClientInfo, registerValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { email, password, firstName, lastName, role } = req.body;

    const user = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, extractClientInfo, loginValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { email, password } = req.body;
    const { ipAddress, userAgent } = req.clientInfo;

    const result = await AuthService.login(email, password, ipAddress, userAgent);

    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    if (error.message.includes('locked')) {
      return res.status(423).json({
        error: error.message,
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const sessionId = req.session.id;

    const result = await AuthService.logout(sessionId);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user,
      session: {
        id: req.session.id,
        created_at: req.session.created_at,
        expires_at: req.session.expires_at,
        ip_address: req.session.ip_address,
      },
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired token
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const currentToken = req.headers.authorization.substring(7);

    const result = await AuthService.refreshToken(currentToken);

    res.json({
      message: 'Token refreshed successfully',
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { poolPromise } = require('../config/database');
    const pool = await poolPromise;

    const result = await pool.request().input('user_id', req.user.id).query(`
        SELECT 
          id,
          ip_address,
          user_agent,
          created_at,
          expires_at,
          is_active,
          CASE WHEN id = @session_id THEN 1 ELSE 0 END as is_current
        FROM UserSessions 
        WHERE user_id = @user_id 
        AND is_active = 1 
        AND expires_at > GETUTCDATE()
        ORDER BY created_at DESC
      `);

    res.json({
      sessions: result.recordset,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate a specific session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot terminate session
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { poolPromise } = require('../config/database');
    const pool = await poolPromise;

    // Check if session belongs to current user
    const sessionCheck = await pool
      .request()
      .input('session_id', sessionId)
      .input('user_id', req.user.id).query(`
        SELECT user_id FROM UserSessions 
        WHERE id = @session_id AND user_id = @user_id
      `);

    if (sessionCheck.recordset.length === 0) {
      return res.status(403).json({
        error: 'Cannot terminate this session',
      });
    }

    await AuthService.logout(sessionId);

    res.json({
      message: 'Session terminated successfully',
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { poolPromise } = require('../config/database');
    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT 
          id,
          email,
          first_name,
          last_name,
          role,
          email_verified,
          is_active,
          created_at,
          updated_at,
          last_login
        FROM Users 
        ORDER BY created_at DESC
      `);

    res.json({
      users: result.recordset,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

module.exports = router;
