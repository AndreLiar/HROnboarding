const express = require('express');
const TemplateApprovalController = require('../controllers/templateApprovalController');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireHROrAdmin } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TemplateApprovalRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         template_id:
 *           type: string
 *           format: uuid
 *         requested_by:
 *           type: string
 *           format: uuid
 *         assigned_to:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         comments:
 *           type: string
 *         changes_requested:
 *           type: string
 *         responded_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /template-approval/requests:
 *   get:
 *     summary: Get approval requests assigned to the current user
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: pending
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Approval requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/requests',
  authenticate,
  requireHROrAdmin,
  TemplateApprovalController.getApprovalRequests
);

/**
 * @swagger
 * /template-approval/requests/{id}:
 *   get:
 *     summary: Get approval request details
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Approval request ID
 *     responses:
 *       200:
 *         description: Approval request details retrieved successfully
 *       404:
 *         description: Approval request not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/requests/:id',
  authenticate,
  requireHROrAdmin,
  TemplateApprovalController.getApprovalRequestDetails
);

/**
 * @swagger
 * /template-approval/templates/{id}/submit:
 *   post:
 *     summary: Submit a template for approval
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional comments for the approval request
 *     responses:
 *       200:
 *         description: Template submitted for approval successfully
 *       404:
 *         description: Template not found
 *       400:
 *         description: Template not in draft status or already has pending approval
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/templates/:id/submit',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_EDIT),
  TemplateApprovalController.submitForApproval
);

/**
 * @swagger
 * /template-approval/requests/{id}/approve:
 *   post:
 *     summary: Approve a template
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Approval request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional approval comments
 *     responses:
 *       200:
 *         description: Template approved successfully
 *       404:
 *         description: Approval request not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/requests/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_APPROVE),
  TemplateApprovalController.approveTemplate
);

/**
 * @swagger
 * /template-approval/requests/{id}/reject:
 *   post:
 *     summary: Reject a template
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Approval request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Rejection comments
 *               changes_requested:
 *                 type: string
 *                 description: Specific changes requested
 *     responses:
 *       200:
 *         description: Template rejected successfully
 *       404:
 *         description: Approval request not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/requests/:id/reject',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_APPROVE),
  TemplateApprovalController.rejectTemplate
);

/**
 * @swagger
 * /template-approval/templates/{templateId}/history:
 *   get:
 *     summary: Get approval history for a template
 *     tags: [Template Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template approval history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/templates/:templateId/history',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_VIEW),
  TemplateApprovalController.getTemplateApprovalHistory
);

module.exports = router;