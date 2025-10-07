const express = require('express');
const StatusController = require('../controllers/statusController');

const router = express.Router();

// GET / - API status
router.get('/', StatusController.getStatus);

// GET /status - API status (alternative endpoint)
router.get('/status', StatusController.getStatus);

module.exports = router;
