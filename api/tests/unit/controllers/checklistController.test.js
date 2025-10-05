const ChecklistController = require('../../../controllers/checklistController');
const ChecklistService = require('../../../services/checklistService');
const DatabaseService = require('../../../services/databaseService');
const helpers = require('../../../utils/helpers');

// Mock dependencies
jest.mock('../../../services/checklistService');
jest.mock('../../../services/databaseService');
jest.mock('../../../utils/helpers');

describe('ChecklistController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChecklist', () => {
    test('should generate checklist with valid input', async () => {
      // Arrange
      const mockResult = {
        checklist: [
          { task: 'Setup development environment', category: 'Technical', completed: false },
          { task: 'Complete HR documentation', category: 'Administrative', completed: false },
        ],
        role: 'Développeur Senior',
        department: 'Informatique',
      };

      ChecklistService.generateChecklist.mockResolvedValue(mockResult);
      helpers.validateRequired.mockImplementation(() => {}); // No error
      helpers.successResponse.mockImplementation(data => data);

      const req = testUtils.createMockRequest({
        body: {
          role: 'Développeur Senior',
          department: 'Informatique',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(helpers.validateRequired).toHaveBeenCalledWith(['role', 'department'], req.body);
      expect(ChecklistService.generateChecklist).toHaveBeenCalledWith(
        'Développeur Senior',
        'Informatique'
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test('should return 400 for missing required fields', async () => {
      // Arrange
      helpers.validateRequired.mockImplementation(() => {
        throw new Error('Missing required fields: role, department');
      });
      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));

      const req = testUtils.createMockRequest({
        body: {
          // Missing role and department
          name: 'John Doe',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: role, department',
      });

      expect(ChecklistService.generateChecklist).not.toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      // Arrange
      helpers.validateRequired.mockImplementation(() => {}); // No validation error
      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));
      ChecklistService.generateChecklist.mockRejectedValue(new Error('OpenAI API error'));

      const req = testUtils.createMockRequest({
        body: {
          role: 'Développeur Senior',
          department: 'Informatique',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to generate checklist',
      });
    });

    test('should validate role and department values', async () => {
      // Arrange
      helpers.validateRequired.mockImplementation(() => {
        throw new Error('Missing required fields: role');
      });
      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));

      const req = testUtils.createMockRequest({
        body: {
          role: '', // Empty role
          department: 'Informatique',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: role',
      });
    });
  });

  describe('shareChecklist', () => {
    test('should save checklist and return share ID', async () => {
      // Arrange
      const mockSlug = 'abc123def456';
      const mockChecklist = [
        { task: 'Setup environment', completed: false },
        { task: 'Review documentation', completed: true },
      ];

      helpers.generateSlug.mockReturnValue(mockSlug);
      helpers.successResponse.mockImplementation(data => data);
      DatabaseService.saveChecklist.mockResolvedValue(mockSlug);

      const req = testUtils.createMockRequest({
        body: {
          checklist: mockChecklist,
          role: 'Developer',
          department: 'Engineering',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(helpers.generateSlug).toHaveBeenCalled();
      expect(DatabaseService.saveChecklist).toHaveBeenCalledWith(
        mockSlug,
        mockSlug,
        mockChecklist,
        'Developer',
        'Engineering'
      );

      expect(res.json).toHaveBeenCalledWith({ slug: mockSlug });
    });

    test('should return 400 for invalid checklist data', async () => {
      // Arrange
      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));

      const req = testUtils.createMockRequest({
        body: {
          // Missing checklist
          role: 'Developer',
          department: 'Engineering',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Valid checklist array is required',
      });

      expect(DatabaseService.saveChecklist).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      // Arrange
      helpers.generateSlug.mockReturnValue('test123');
      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));
      DatabaseService.saveChecklist.mockRejectedValue(new Error('Database connection failed'));

      const req = testUtils.createMockRequest({
        body: {
          checklist: [{ task: 'Test task', completed: false }],
          role: 'Developer',
          department: 'Engineering',
        },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to save checklist',
      });
    });
  });

  describe('getSharedChecklist', () => {
    test('should retrieve shared checklist by ID', async () => {
      // Arrange
      const shareId = 'abc123def456';
      const mockChecklistData = {
        checklist: [
          { task: 'Setup environment', completed: false },
          { task: 'Review documentation', completed: true },
        ],
        role: 'Developer',
        department: 'Engineering',
        createdAt: '2023-01-01T00:00:00Z',
      };

      helpers.successResponse.mockImplementation(data => data);
      DatabaseService.getChecklistBySlug.mockResolvedValue(mockChecklistData);

      const req = testUtils.createMockRequest({
        params: { slug: shareId },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(DatabaseService.getChecklistBySlug).toHaveBeenCalledWith(shareId);
      expect(res.json).toHaveBeenCalledWith(mockChecklistData);
    });

    test('should return 404 for non-existent checklist', async () => {
      // Arrange
      const shareId = 'nonexistent123';

      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));
      DatabaseService.getChecklistBySlug.mockResolvedValue(null);

      const req = testUtils.createMockRequest({
        params: { slug: shareId },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Checklist not found',
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const shareId = 'test123';

      helpers.errorResponse.mockImplementation(msg => ({ error: msg }));
      DatabaseService.getChecklistBySlug.mockRejectedValue(new Error('Database error'));

      const req = testUtils.createMockRequest({
        params: { slug: shareId },
      });

      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve checklist',
      });
    });
  });
});
