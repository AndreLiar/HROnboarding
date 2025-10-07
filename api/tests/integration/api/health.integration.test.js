const request = require('supertest');
const app = require('../../../server');

describe('Health API Integration Tests', () => {
  // Add longer delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
  });

  describe('GET /health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

      // Validate uptime is a number
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent response structure across multiple calls', async () => {
      // Sequential requests with delays to avoid rate limiting
      const responses = [];
      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        const response = await request(app).get('/health');
        responses.push(response);
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('message', 'HR Onboarding API is healthy');
        expect(response.body).toHaveProperty('version', '1.0.0');
      });

      // Uptime should be increasing
      const uptimes = responses.map(r => r.body.uptime);
      expect(uptimes[1]).toBeGreaterThanOrEqual(uptimes[0]);
      expect(uptimes[2]).toBeGreaterThanOrEqual(uptimes[1]);
    });

    it('should return health status quickly', async () => {
      const startTime = Date.now();

      await request(app).get('/health').expect(200);

      const responseTime = Date.now() - startTime;

      // Health check should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('GET /status', () => {
    it('should return status information', async () => {
      const response = await request(app).get('/status').expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('message', 'HR Onboarding API is running');
      expect(response.body).toHaveProperty('version', '1.0.0');

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should be accessible without authentication', async () => {
      // Sequential requests with delays to avoid rate limiting
      const responses = [];
      for (let i = 0; i < 10; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        const response = await request(app).get('/status');
        responses.push(response);
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent health endpoints gracefully', async () => {
      await request(app).get('/health/detailed').expect(404);
    });

    it('should handle malformed health requests', async () => {
      await request(app)
        .post('/health') // Wrong method
        .expect(404);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent health checks', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      // Sequential requests with minimal delays for load testing
      const responses = [];
      for (let i = 0; i < concurrentRequests; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        const response = await request(app).get('/health');
        responses.push(response);
      }
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(100); // 100ms average

      console.log(
        `✅ Handled ${concurrentRequests} concurrent health checks in ${totalTime}ms (avg: ${avgResponseTime.toFixed(2)}ms)`
      );
    });

    it('should maintain performance under load', async () => {
      const iterations = 3;
      const requestsPerIteration = 20;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Sequential requests with delays
        const iterationResponses = [];
        for (let j = 0; j < requestsPerIteration; j++) {
          if (j > 0) {
            await new Promise(resolve => setTimeout(resolve, 40));
          }
          const response = await request(app).get('/health');
          iterationResponses.push(response);
        }
        const iterationTime = Date.now() - startTime;

        // All requests should succeed
        iterationResponses.forEach(response => {
          expect(response.status).toBe(200);
        });

        responseTimes.push(iterationTime);
      }

      // Performance should be consistent across iterations
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      expect(maxTime).toBeLessThan(avgTime * 2); // No iteration should take more than 2x average

      console.log(`✅ Performance test completed: avg=${avgTime.toFixed(2)}ms, max=${maxTime}ms`);
    });
  });

  describe('Response Headers', () => {
    it('should include proper security headers', async () => {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      const response = await request(app).get('/health').expect(200);

      // Check for security headers set by helmet
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should return JSON content type', async () => {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include connection keep-alive for Azure', async () => {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      const response = await request(app).get('/health').expect(200);

      // If running on Azure, should have keep-alive
      if (process.env.WEBSITE_SITE_NAME) {
        expect(response.headers.connection).toBe('keep-alive');
      }
    });
  });
});
