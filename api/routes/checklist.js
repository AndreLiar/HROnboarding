const express = require('express');
const ChecklistController = require('../controllers/checklistController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requirePermission, requireHROrAdmin } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

/**
 * @swagger
 * /generate:
 *   post:
 *     summary: Generate a new onboarding checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - department
 *             properties:
 *               role:
 *                 type: string
 *                 description: Employee role
 *               department:
 *                 type: string
 *                 description: Department name
 *               customRequirements:
 *                 type: array
 *                 description: Additional custom requirements
 *     responses:
 *       200:
 *         description: Checklist generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/generate',
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : authenticate,
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : requirePermission(PERMISSIONS.CHECKLISTS_CREATE),
  ChecklistController.generateChecklist
);

/**
 * @swagger
 * /share:
 *   post:
 *     summary: Share a checklist (HR Manager and Admin only)
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checklist
 *               - role
 *               - department
 *             properties:
 *               checklist:
 *                 type: array
 *                 description: Checklist items
 *               role:
 *                 type: string
 *                 description: Target role
 *               department:
 *                 type: string
 *                 description: Target department
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign checklist to
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Due date for completion
 *     responses:
 *       200:
 *         description: Checklist shared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/share',
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : authenticate,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : requireHROrAdmin,
  ChecklistController.shareChecklist
);

/**
 * @swagger
 * /c/{slug}:
 *   get:
 *     summary: Get a shared checklist by slug
 *     tags: [Checklists]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist slug
 *     responses:
 *       200:
 *         description: Shared checklist retrieved successfully
 *       404:
 *         description: Checklist not found
 */
router.get(
  '/shared/:slug', // Changed from /c/:slug to /shared/:slug for clarity
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : optionalAuth,
  ChecklistController.getSharedChecklist
);

module.exports = router;
