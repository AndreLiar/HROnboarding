const express = require('express');
const statusRoutes = require('./status');
const checklistRoutes = require('./checklist');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const setupRoutes = require('./setup');
const usersRoutes = require('./users');
const templateRoutes = require('./templates');
const templateApprovalRoutes = require('./templateApproval');

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/setup', setupRoutes);
router.use('/users', usersRoutes);
router.use('/templates', templateRoutes);
router.use('/template-approval', templateApprovalRoutes);
router.use('/', statusRoutes);
router.use('/', checklistRoutes);
router.use('/', healthRoutes);

module.exports = router;
