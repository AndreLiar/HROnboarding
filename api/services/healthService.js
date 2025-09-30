const openai = require('../config/openai');
const DatabaseService = require('./databaseService');

class HealthService {
  static async getHealthStatus() {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'Unknown',
        openai: openai ? 'Available' : 'Not configured',
      },
    };

    // Test database connection
    health.services.database = await DatabaseService.testConnection();

    return health;
  }
}

module.exports = HealthService;
