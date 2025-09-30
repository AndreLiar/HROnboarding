const express = require('express');
const statusRoutes = require('./status');
const checklistRoutes = require('./checklist');
const healthRoutes = require('./health');

const router = express.Router();

// Mount all routes
router.use('/', statusRoutes);
router.use('/', checklistRoutes);
router.use('/', healthRoutes);

module.exports = router;
