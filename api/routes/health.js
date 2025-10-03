const express = require('express');
const HealthController = require('../controllers/healthController');

const router = express.Router();

// GET /health - Health check
router.get('/health', HealthController.getHealth);

// GET /status - Simple status check (no database dependency)
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'HR Onboarding API is running',
    version: '1.0.0'
  });
});

module.exports = router;
