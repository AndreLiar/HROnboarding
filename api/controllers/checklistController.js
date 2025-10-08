const ChecklistService = require('../services/checklistService');
const DatabaseService = require('../services/databaseService');
const {
  validateRequired,
  generateSlug,
  errorResponse,
  successResponse,
} = require('../utils/helpers');

class ChecklistController {
  /**
   * @swagger
   * /generate:
   *   post:
   *     summary: Génère une checklist d'intégration personnalisée
   *     description: Utilise l'IA (OpenAI) pour générer une checklist d'intégration adaptée au rôle et département spécifiés. Inclut les exigences légales françaises (DPAE, RGPD, médecine du travail).
   *     tags:
   *       - Checklist
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GenerateRequest'
   *           examples:
   *             exemple1:
   *               summary: Développeur Senior en Informatique
   *               value:
   *                 role: "Développeur Senior"
   *                 department: "Informatique"
   *             exemple2:
   *               summary: Commercial en Marketing
   *               value:
   *                 role: "Commercial"
   *                 department: "Marketing"
   *     responses:
   *       200:
   *         description: Checklist générée avec succès
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenerateResponse'
   *       400:
   *         description: Paramètres manquants
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erreur serveur lors de la génération
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async generateChecklist(req, res) {
    try {
      const { role, department } = req.body;

      validateRequired(['role', 'department'], req.body);

      const result = await ChecklistService.generateChecklist(role, department);

      res.json(successResponse(result));
    } catch (error) {
      console.error('Error generating checklist:', error);
      const isValidationError = error.message.includes('Missing required') || error.message.includes(' is required');
      res
        .status(isValidationError ? 400 : 500)
        .json(
          errorResponse(
            isValidationError
              ? error.message
              : 'Failed to generate checklist'
          )
        );
    }
  }

  /**
   * @swagger
   * /share:
   *   post:
   *     summary: Sauvegarde une checklist et génère un lien de partage
   *     description: Enregistre une checklist en base de données et retourne un identifiant unique pour le partage
   *     tags:
   *       - Checklist
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ShareRequest'
   *     responses:
   *       200:
   *         description: Checklist sauvegardée avec succès
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ShareResponse'
   *       400:
   *         description: Checklist invalide
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erreur lors de la sauvegarde
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async shareChecklist(req, res) {
    try {
      const { checklist, role, department } = req.body;

      if (!checklist || !Array.isArray(checklist)) {
        return res.status(400).json(errorResponse('Valid checklist array is required'));
      }

      const slug = generateSlug();

      await DatabaseService.saveChecklist(slug, slug, checklist, role, department);

      res.json(successResponse({ 
        slug,
        shareUrl: `/c/${slug}` 
      }));
    } catch (error) {
      console.error('Error saving checklist:', error);
      res.status(500).json(errorResponse('Failed to save checklist'));
    }
  }

  /**
   * @swagger
   * /c/{slug}:
   *   get:
   *     summary: Récupère une checklist partagée
   *     description: Retourne une checklist sauvegardée à partir de son identifiant unique
   *     tags:
   *       - Checklist
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         description: Identifiant unique de la checklist
   *         schema:
   *           type: string
   *           example: "abc123def4"
   *     responses:
   *       200:
   *         description: Checklist trouvée
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SharedChecklist'
   *       404:
   *         description: Checklist non trouvée
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Erreur lors de la récupération
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async getSharedChecklist(req, res) {
    try {
      const { slug } = req.params;

      // Validate slug format (alphanumeric and hyphens only, no path traversal)
      const slugPattern = /^[a-zA-Z0-9\-]+$/;
      if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..') || !slugPattern.test(slug)) {
        return res.status(400).json(errorResponse('Invalid slug format'));
      }

      const result = await DatabaseService.getChecklistBySlug(slug);

      if (!result) {
        return res.status(404).json(errorResponse('Checklist not found'));
      }

      res.json(successResponse(result));
    } catch (error) {
      console.error('Error retrieving checklist:', error);
      res.status(500).json(errorResponse('Failed to retrieve checklist'));
    }
  }
}

module.exports = ChecklistController;
