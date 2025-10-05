const StatusController = require('../../../controllers/statusController');

describe('StatusController', () => {
  describe('getStatus', () => {
    test('should return API status information', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      StatusController.getStatus(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'HR Onboarding API is running',
        timestamp: expect.any(String),
        port: expect.anything(), // PORT can be string or number
        env: expect.any(String),
      });
    });

    test('should include correct timestamp format', async () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      StatusController.getStatus(req, res);

      // Assert
      const callArgs = res.json.mock.calls[0][0];
      const timestamp = callArgs.timestamp;

      // Verify timestamp is valid ISO string
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    test('should include port and environment information', () => {
      // Arrange
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();

      // Act
      StatusController.getStatus(req, res);

      // Assert
      const callArgs = res.json.mock.calls[0][0];

      expect(callArgs.port).toEqual(expect.anything()); // PORT can be string or number
      expect(callArgs.env).toEqual(expect.any(String));
      expect(callArgs.message).toBe('HR Onboarding API is running');
    });
  });
});
