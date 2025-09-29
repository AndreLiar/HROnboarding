const express = require('express');
const HealthController = require('../controllers/healthController');

const router = express.Router();

// GET /health - Health check
router.get('/health', HealthController.getHealth);

module.exports = router;