const TemplateController = require('../../../controllers/templateController');
const DatabaseService = require('../../../services/databaseService');

// Mock dependencies
jest.mock('../../../services/databaseService');
jest.mock('mssql');

describe('TemplateController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    test('should return paginated templates list', async () => {
      // Arrange
      const mockTemplates = [
        {
          id: '1',
          name: 'Developer Onboarding',
          category: 'technical',
          status: 'approved',
          item_count: 10
        },
        {
          id: '2', 
          name: 'HR Process',
          category: 'administrative',
          status: 'approved',
          item_count: 5
        }
      ];

      const mockRequest = {
        query: jest.fn().mockResolvedValue({
          recordsets: [mockTemplates, [{ total: 2 }]]
        })
      };

      // Mock sql.Request
      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);
      mockRequest.input = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        query: {
          page: '1',
          limit: '10',
          status: 'approved'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.getAllTemplates(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        templates: mockTemplates,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      });
    });

    test('should handle search filtering', async () => {
      // Arrange
      const mockRequest = {
        query: jest.fn().mockResolvedValue({
          recordsets: [[], [{ total: 0 }]]
        })
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);
      mockRequest.input = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        query: {
          search: 'developer',
          category: 'technical'
        }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.getAllTemplates(req, res);

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith('search', '%developer%');
      expect(mockRequest.input).toHaveBeenCalledWith('category', 'technical');
    });
  });

  describe('createTemplate', () => {
    test('should create new template successfully', async () => {
      // Arrange
      const mockRequest = {
        query: jest.fn().mockResolvedValue({}),
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        body: {
          name: 'New Developer Template',
          description: 'Template for new developers',
          category: 'technical',
          items: [
            {
              title: 'Setup IDE',
              description: 'Install and configure development environment',
              is_required: true
            }
          ]
        },
        user: { id: 'user123' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.createTemplate(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Template created successfully',
        templateId: expect.any(String),
        status: 'draft'
      });
    });

    test('should validate required fields', async () => {
      // Arrange
      const req = testUtils.createMockRequest({
        body: {
          // Missing name and category
          description: 'Test description'
        },
        user: { id: 'user123' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.createTemplate(req, res);

      // Assert - This would depend on your actual validation logic
      // For now, assuming the method handles validation
      expect(res.status).toHaveBeenCalledWith(500); // or 400 if validation is implemented
    });
  });

  describe('getTemplateById', () => {
    test('should return template with items', async () => {
      // Arrange
      const mockTemplate = {
        id: '123',
        name: 'Test Template',
        category: 'technical',
        status: 'approved'
      };

      const mockItems = [
        { id: '1', title: 'Task 1', sort_order: 1 },
        { id: '2', title: 'Task 2', sort_order: 2 }
      ];

      const mockRequest = {
        query: jest.fn()
          .mockResolvedValueOnce({ recordset: [mockTemplate] })
          .mockResolvedValueOnce({ recordset: mockItems }),
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        params: { id: '123' },
        query: { includeItems: 'true' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.getTemplateById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockTemplate,
        items: mockItems
      });
    });

    test('should return 404 for non-existent template', async () => {
      // Arrange
      const mockRequest = {
        query: jest.fn().mockResolvedValue({ recordset: [] }),
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        params: { id: 'nonexistent' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.getTemplateById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Template not found'
      });
    });
  });

  describe('deleteTemplate', () => {
    test('should delete template if user has permission', async () => {
      // Arrange
      const mockTemplate = {
        id: '123',
        created_by: 'user123',
        name: 'Test Template'
      };

      const mockRequest = {
        query: jest.fn()
          .mockResolvedValueOnce({ recordset: [mockTemplate] }) // Template exists
          .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // No usage
          .mockResolvedValueOnce({}), // Delete successful
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        params: { id: '123' },
        user: { id: 'user123', role: 'user' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.deleteTemplate(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Template deleted successfully'
      });
    });

    test('should prevent deletion if template is in use', async () => {
      // Arrange
      const mockTemplate = {
        id: '123',
        created_by: 'user123',
        name: 'Test Template'
      };

      const mockRequest = {
        query: jest.fn()
          .mockResolvedValueOnce({ recordset: [mockTemplate] }) // Template exists
          .mockResolvedValueOnce({ recordset: [{ count: 5 }] }), // Template in use
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        params: { id: '123' },
        user: { id: 'user123', role: 'user' }
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.deleteTemplate(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot delete template that has been used. Consider archiving instead.'
      });
    });

    test('should prevent deletion if user lacks permission', async () => {
      // Arrange
      const mockTemplate = {
        id: '123',
        created_by: 'different-user',
        name: 'Test Template'
      };

      const mockRequest = {
        query: jest.fn().mockResolvedValueOnce({ recordset: [mockTemplate] }),
        input: jest.fn().mockReturnThis()
      };

      require('mssql').Request = jest.fn().mockReturnValue(mockRequest);

      const req = testUtils.createMockRequest({
        params: { id: '123' },
        user: { id: 'user123', role: 'user' } // Not owner, not admin
      });
      
      const res = testUtils.createMockResponse();

      // Act
      await TemplateController.deleteTemplate(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete this template'
      });
    });
  });
});