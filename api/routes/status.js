const express = require('express');
const StatusController = require('../controllers/statusController');

const router = express.Router();

// GET / - API status
router.get('/', StatusController.getStatus);

module.exports = router;
