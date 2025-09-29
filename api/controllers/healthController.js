const HealthService = require('../services/healthService');
const { successResponse } = require('../utils/helpers');

class HealthController {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Vérification de l'état de l'API
   *     description: Retourne l'état de santé de l'API et de ses services (base de données, OpenAI)
   *     tags:
   *       - Status
   *     responses:
   *       200:
   *         description: État de santé de l'API
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             examples:
   *               healthy:
   *                 summary: Services fonctionnels
   *                 value:
   *                   status: "OK"
   *                   timestamp: "2024-01-15T10:30:00.000Z"
   *                   version: "1.0.0"
   *                   services:
   *                     database: "Connected"
   *                     openai: "Available"
   *               unhealthy:
   *                 summary: Problème de base de données
   *                 value:
   *                   status: "OK"
   *                   timestamp: "2024-01-15T10:30:00.000Z"
   *                   version: "1.0.0"
   *                   services:
   *                     database: "Disconnected"
   *                     openai: "Not configured"
   */
  static async getHealth(req, res) {
    try {
      const health = await HealthService.getHealthStatus();
      res.json(successResponse(health));
    } catch (error) {
      console.error('Error checking health:', error);
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }
}

module.exports = HealthController;