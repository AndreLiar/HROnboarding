require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

// Import configurations
const swaggerSpecs = require('./config/swagger');

// Import services
const DatabaseService = require('./services/databaseService');

// Import middleware
const { generalLimiter, securityHeaders } = require('./middleware/auth');

// Import routes
const routes = require('./routes');

// Environment validation
console.log('🔍 Environment validation:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- DATABASE_SERVER:', process.env.DATABASE_SERVER ? 'set' : 'not set');
console.log('- DATABASE_NAME:', process.env.DATABASE_NAME ? 'set' : 'not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'not set');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses (required for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Custom security headers
app.use(securityHeaders);

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(
  cors({
    origin: [
      'https://mango-pebble-0d01d2103.1.azurestaticapps.net',
      'http://localhost:3002',
      'http://localhost:5173',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HR Onboarding API Documentation',
  })
);

// Early health check for Azure - before route mounting
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'HR Onboarding API is healthy',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// Mount all routes
app.use('/', routes);

// Add startup logging for Azure diagnostics
console.log('🚀 Starting HR Onboarding API server...');
console.log('🔧 Server configuration:');
console.log(`  - Port: ${PORT}`);
console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`  - Process ID: ${process.pid}`);
console.log(
  `  - Azure Detection: ${process.env.WEBSITE_SITE_NAME ? 'Running on Azure' : 'Local/Other'}`
);

// Azure-specific optimizations
if (process.env.WEBSITE_SITE_NAME) {
  console.log('🔵 Azure App Service detected - applying optimizations');
  // Set keepalive for Azure load balancer
  app.use((req, res, next) => {
    res.setHeader('Connection', 'keep-alive');
    next();
  });
}

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HR Onboarding API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`✅ Server started successfully and accepting connections`);

  // Initialize database in background (non-blocking) with longer delay for Azure startup
  setTimeout(() => {
    console.log('🔄 Starting database initialization...');
    DatabaseService.initializeDatabase()
      .then(() => {
        console.log('✅ Database initialized successfully');
      })
      .catch(err => {
        console.error('❌ Database initialization failed:', err.message);
        console.log('🔄 App continues without database functionality');
      });
  }, 5000); // Increased delay for Azure startup
});

// Handle server startup errors
server.on('error', err => {
  console.error('❌ Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`📍 Port ${PORT} is already in use`);
  }
  throw new Error(`Server failed to start: ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;
