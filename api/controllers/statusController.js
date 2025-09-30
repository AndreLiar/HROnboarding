const { successResponse } = require('../utils/helpers');

const PORT = process.env.PORT || 3001;

class StatusController {
  /**
   * @swagger
   * /:
   *   get:
   *     summary: API status endpoint
   *     description: Retourne le statut de l'API et les informations de base
   *     tags:
   *       - Status
   *     responses:
   *       200:
   *         description: API fonctionnelle
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "HR Onboarding API is running"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 port:
   *                   type: number
   *                   example: 3001
   *                 env:
   *                   type: string
   *                   example: "development"
   */
  static getStatus(req, res) {
    const response = successResponse({
      message: 'HR Onboarding API is running',
      timestamp: new Date().toISOString(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });

    res.json(response);
  }
}

module.exports = StatusController;
