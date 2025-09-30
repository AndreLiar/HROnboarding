require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

// Import configurations
const swaggerSpecs = require('./config/swagger');

// Import services
const DatabaseService = require('./services/databaseService');

// Import routes
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: [
    'https://mango-pebble-0d01d2103.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HR Onboarding API Documentation'
}));

// Mount all routes
app.use('/', routes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HR Onboarding API running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📚 API Documentation: http://0.0.0.0:${PORT}/api-docs`);
  console.log(`✅ Server started successfully`);
  
  // Initialize database in background (non-blocking)
  setTimeout(() => {
    DatabaseService.initializeDatabase().catch(err => {
      console.error('Database initialization failed:', err.message);
    });
  }, 1000);
});

module.exports = app;