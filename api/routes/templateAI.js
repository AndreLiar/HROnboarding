const express = require('express');
const TemplateAIController = require('../controllers/templateAIController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AITemplateRequest:
 *       type: object
 *       required:
 *         - role
 *         - department
 *       properties:
 *         role:
 *           type: string
 *           description: Role du nouvel employé
 *           example: "Développeur Frontend"
 *         department:
 *           type: string
 *           description: Département du nouvel employé
 *           example: "IT"
 *         specific_requirements:
 *           type: string
 *           description: Exigences spécifiques pour le template
 *           example: "Formation React, accès GitLab, certification sécurité"
 *         auto_save:
 *           type: boolean
 *           description: Sauvegarder automatiquement le template généré
 *           default: false
 *     AITemplateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         template:
 *           $ref: '#/components/schemas/GeneratedTemplate'
 *         generated_by:
 *           type: string
 *           example: "AI"
 *         saved:
 *           type: boolean
 *     GeneratedTemplate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         estimated_duration_minutes:
 *           type: integer
 *         target_roles:
 *           type: array
 *           items:
 *             type: string
 *         target_departments:
 *           type: array
 *           items:
 *             type: string
 *         tags:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TemplateItemAI'
 *     TemplateItemAI:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         assignee_role:
 *           type: string
 *         due_days_from_start:
 *           type: integer
 *         estimated_duration_minutes:
 *           type: integer
 *         is_required:
 *           type: boolean
 *         sort_order:
 *           type: integer
 */

/**
 * @swagger
 * /template-ai/generate:
 *   post:
 *     summary: Generate a complete template using AI
 *     tags: [Template AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AITemplateRequest'
 *     responses:
 *       200:
 *         description: Template generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AITemplateResponse'
 *       201:
 *         description: Template generated and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AITemplateResponse'
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: AI generation failed
 */
router.post(
  '/generate',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_CREATE),
  TemplateAIController.generateTemplate
);

/**
 * @swagger
 * /template-ai/enhance/{id}:
 *   post:
 *     summary: Enhance an existing template with AI suggestions
 *     tags: [Template AI]
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
 *               role:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Enhancement suggestions generated
 *       404:
 *         description: Template not found
 *       500:
 *         description: AI enhancement failed
 */
router.post(
  '/enhance/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_EDIT),
  TemplateAIController.enhanceTemplate
);

/**
 * @swagger
 * /template-ai/compliance/{id}:
 *   get:
 *     summary: Check template compliance with French HR regulations using AI
 *     tags: [Template AI]
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
 *         description: Compliance check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 template:
 *                   type: object
 *                 compliance:
 *                   type: object
 *                   properties:
 *                     compliance_status:
 *                       type: string
 *                       enum: [compliant, needs_improvement, non_compliant]
 *                     missing_requirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                     suggested_improvements:
 *                       type: array
 *                       items:
 *                         type: object
 *                 generated_by:
 *                   type: string
 *       404:
 *         description: Template not found
 *       500:
 *         description: Compliance check failed
 */
router.get(
  '/compliance/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_VIEW),
  TemplateAIController.checkCompliance
);

/**
 * @swagger
 * /template-ai/suggest-items:
 *   get:
 *     summary: Get AI suggestions for template items
 *     tags: [Template AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: Role du nouvel employé
 *       - in: query
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Département du nouvel employé
 *       - in: query
 *         name: existing_count
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Nombre d'items déjà existants
 *     responses:
 *       200:
 *         description: Item suggestions generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TemplateItemAI'
 *                 role:
 *                   type: string
 *                 department:
 *                   type: string
 *                 generated_by:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Suggestion generation failed
 */
router.get(
  '/suggest-items',
  authenticate,
  requirePermission(PERMISSIONS.TEMPLATES_CREATE),
  TemplateAIController.suggestItems
);

module.exports = router;
