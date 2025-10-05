const StatusController = require('../../../controllers/statusController');

describe('StatusController', () => {
  describe('getStatus', () => {
    test('should return API status information', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      await StatusController.getStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'active',
        message: 'HR Onboarding API is running',
        version: '1.0.0',
        timestamp: expect.any(String),
        port: expect.any(Number)
      });
    });

    test('should include correct timestamp format', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      await StatusController.getStatus(req, res);

      // Assert
      const callArgs = res.json.mock.calls[0][0];
      const timestamp = callArgs.timestamp;
      
      // Verify timestamp is valid ISO string
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('getHealth', () => {
    test('should return health check information', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      await StatusController.getHealth(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number)
        }),
        environment: expect.any(String)
      });
    });

    test('should include process uptime', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      await StatusController.getHealth(req, res);

      // Assert
      const callArgs = res.json.mock.calls[0][0];
      const uptime = callArgs.uptime;
      
      expect(uptime).toBeGreaterThan(0);
      expect(typeof uptime).toBe('number');
    });

    test('should include memory usage information', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      await StatusController.getHealth(req, res);

      // Assert
      const callArgs = res.json.mock.calls[0][0];
      const memory = callArgs.memory;
      
      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('total');
      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(memory.used);
    });
  });
});