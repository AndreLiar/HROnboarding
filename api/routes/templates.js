const express = require('express');
const TemplateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Template:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         version:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [draft, pending_approval, approved, archived]
 *         template_data:
 *           type: string
 *         tags:
 *           type: string
 *         estimated_duration_minutes:
 *           type: integer
 *         target_roles:
 *           type: string
 *         target_departments:
 *           type: string
 *         compliance_frameworks:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     TemplateItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         template_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         is_required:
 *           type: boolean
 *         estimated_duration_minutes:
 *           type: integer
 *         sort_order:
 *           type: integer
 *         assignee_role:
 *           type: string
 *         due_days_from_start:
 *           type: integer
 *         instructions:
 *           type: string
 *         success_criteria:
 *           type: string
 *         attachments_required:
 *           type: boolean
 *         approval_required:
 *           type: boolean
 */

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Get all templates with filtering and pagination
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: approved
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, description, and tags
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
 *         description: Templates retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_VIEW),
  TemplateController.getAllTemplates
);

/**
 * @swagger
 * /templates/categories:
 *   get:
 *     summary: Get all template categories
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/categories',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_VIEW),
  TemplateController.getCategories
);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Get a specific template by ID
 *     tags: [Templates]
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
 *       - in: query
 *         name: includeItems
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include template items
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_VIEW),
  TemplateController.getTemplateById
);

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create a new template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               template_data:
 *                 type: string
 *               tags:
 *                 type: string
 *               estimated_duration_minutes:
 *                 type: integer
 *               target_roles:
 *                 type: string
 *               target_departments:
 *                 type: string
 *               compliance_frameworks:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TemplateItem'
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_CREATE),
  TemplateController.createTemplate
);

/**
 * @swagger
 * /templates/{id}:
 *   put:
 *     summary: Update an existing template
 *     tags: [Templates]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               template_data:
 *                 type: string
 *               tags:
 *                 type: string
 *               estimated_duration_minutes:
 *                 type: integer
 *               target_roles:
 *                 type: string
 *               target_departments:
 *                 type: string
 *               compliance_frameworks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.put('/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_EDIT),
  TemplateController.updateTemplate
);

/**
 * @swagger
 * /templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     tags: [Templates]
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
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_DELETE),
  TemplateController.deleteTemplate
);

/**
 * @swagger
 * /templates/{id}/clone:
 *   post:
 *     summary: Clone/duplicate a template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Source template ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the cloned template
 *     responses:
 *       201:
 *         description: Template cloned successfully
 *       404:
 *         description: Source template not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/:id/clone',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_CREATE),
  TemplateController.cloneTemplate
);

module.exports = router;