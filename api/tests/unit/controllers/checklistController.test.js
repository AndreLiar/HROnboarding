const ChecklistController = require('../../../controllers/checklistController');
const ChecklistService = require('../../../services/checklistService');
const DatabaseService = require('../../../services/databaseService');

// Mock dependencies
jest.mock('../../../services/checklistService');
jest.mock('../../../services/databaseService');

describe('ChecklistController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChecklist', () => {
    test('should generate checklist with valid input', async () => {
      // Arrange
      const mockChecklist = [
        { task: 'Setup development environment', category: 'Technical', completed: false },
        { task: 'Complete HR documentation', category: 'Administrative', completed: false }
      ];
      
      ChecklistService.generatePersonalizedChecklist.mockResolvedValue(mockChecklist);
      
      const req = testUtils.createMockRequest({
        body: {
          role: 'Développeur Senior',
          department: 'Informatique',
          experience: 'senior',
          name: 'John Doe'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(ChecklistService.generatePersonalizedChecklist).toHaveBeenCalledWith({
        role: 'Développeur Senior',
        department: 'Informatique',
        experience: 'senior',
        name: 'John Doe'
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        checklist: mockChecklist,
        metadata: {
          role: 'Développeur Senior',
          department: 'Informatique',
          experience: 'senior',
          totalTasks: 2,
          completedTasks: 0,
          progressPercentage: 0
        }
      });
    });

    test('should return 400 for missing required fields', async () => {
      // Arrange
      const req = testUtils.createMockRequest({
        body: {
          // Missing role and department
          name: 'John Doe'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role and department are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      
      expect(ChecklistService.generatePersonalizedChecklist).not.toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      // Arrange
      ChecklistService.generatePersonalizedChecklist.mockRejectedValue(
        new Error('OpenAI API error')
      );
      
      const req = testUtils.createMockRequest({
        body: {
          role: 'Développeur Senior',
          department: 'Informatique'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate checklist',
        details: 'OpenAI API error'
      });
    });

    test('should validate role and department values', async () => {
      // Arrange
      const req = testUtils.createMockRequest({
        body: {
          role: '', // Empty role
          department: 'Informatique'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.generateChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role and department are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    });
  });

  describe('shareChecklist', () => {
    test('should save checklist and return share ID', async () => {
      // Arrange
      const mockShareId = 'abc123def456';
      const mockChecklist = [
        { task: 'Setup environment', completed: false },
        { task: 'Review documentation', completed: true }
      ];
      
      DatabaseService.saveChecklist.mockResolvedValue({
        id: mockShareId,
        slug: mockShareId
      });
      
      const req = testUtils.createMockRequest({
        body: {
          checklist: mockChecklist,
          metadata: {
            role: 'Developer',
            department: 'Engineering',
            name: 'John Doe'
          }
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(DatabaseService.saveChecklist).toHaveBeenCalledWith({
        checklist: mockChecklist,
        metadata: {
          role: 'Developer',
          department: 'Engineering',
          name: 'John Doe'
        }
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        shareId: mockShareId,
        shareUrl: expect.stringContaining(mockShareId)
      });
    });

    test('should return 400 for invalid checklist data', async () => {
      // Arrange
      const req = testUtils.createMockRequest({
        body: {
          // Missing checklist
          metadata: {
            role: 'Developer',
            department: 'Engineering'
          }
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Checklist data is required'
      });
      
      expect(DatabaseService.saveChecklist).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      // Arrange
      DatabaseService.saveChecklist.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const req = testUtils.createMockRequest({
        body: {
          checklist: [{ task: 'Test task', completed: false }],
          metadata: { role: 'Developer', department: 'Engineering' }
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.shareChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to save checklist',
        details: 'Database connection failed'
      });
    });
  });

  describe('getSharedChecklist', () => {
    test('should retrieve shared checklist by ID', async () => {
      // Arrange
      const shareId = 'abc123def456';
      const mockChecklistData = {
        id: shareId,
        checklist: [
          { task: 'Setup environment', completed: false },
          { task: 'Review documentation', completed: true }
        ],
        metadata: {
          role: 'Developer',
          department: 'Engineering',
          name: 'John Doe',
          createdAt: '2023-01-01T00:00:00Z'
        }
      };
      
      DatabaseService.getChecklistBySlug.mockResolvedValue(mockChecklistData);
      
      const req = testUtils.createMockRequest({
        params: { slug: shareId }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(DatabaseService.getChecklistBySlug).toHaveBeenCalledWith(shareId);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockChecklistData
      });
    });

    test('should return 404 for non-existent checklist', async () => {
      // Arrange
      const shareId = 'nonexistent123';
      
      DatabaseService.getChecklistBySlug.mockResolvedValue(null);
      
      const req = testUtils.createMockRequest({
        params: { slug: shareId }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Checklist not found'
      });
    });

    test('should return 400 for missing slug parameter', async () => {
      // Arrange
      const req = testUtils.createMockRequest({
        params: {} // Missing slug
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await ChecklistController.getSharedChecklist(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Slug parameter is required'
      });
      
      expect(DatabaseService.getChecklistBySlug).not.toHaveBeenCalled();
    });
  });
});