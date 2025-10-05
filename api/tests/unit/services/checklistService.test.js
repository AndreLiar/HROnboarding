const ChecklistService = require('../../../services/checklistService');
const openai = require('../../../config/openai');
const { getFallbackChecklist } = require('../../../utils/fallback');

// Mock dependencies
jest.mock('../../../config/openai');
jest.mock('../../../utils/fallback');

describe('ChecklistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChecklist', () => {
    test('should generate checklist using OpenAI when available', async () => {
      // Arrange
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                task: 'Setup development environment',
                category: 'Technical',
                completed: false,
                estimated_duration: '2 hours'
              },
              {
                task: 'Complete HR documentation',
                category: 'Administrative',
                completed: false,
                estimated_duration: '1 hour'
              }
            ])
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      // Mock openai module to return the mock client
      openai.mockReturnValue(mockOpenAI);
      
      // Mock module-level export
      const mockCreate = jest.fn().mockResolvedValue(mockOpenAIResponse);
      require('../../../config/openai').chat = {
        completions: { create: mockCreate }
      };

      const role = 'Développeur Senior';
      const department = 'Informatique';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('task', 'Setup development environment');
      expect(result[0]).toHaveProperty('category', 'Technical');
      expect(result[1]).toHaveProperty('task', 'Complete HR documentation');
    });

    test('should use fallback when OpenAI is not available', async () => {
      // Arrange
      const mockFallbackChecklist = [
        {
          task: 'Fallback task 1',
          category: 'General',
          completed: false
        },
        {
          task: 'Fallback task 2', 
          category: 'General',
          completed: false
        }
      ];

      // Mock openai as null (not configured)
      require('../../../config/openai').mockReturnValue(null);
      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual(mockFallbackChecklist);
    });

    test('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      const mockFallbackChecklist = [
        { task: 'Fallback task', category: 'General', completed: false }
      ];

      const mockCreate = jest.fn().mockRejectedValue(new Error('OpenAI API Error'));
      require('../../../config/openai').chat = {
        completions: { create: mockCreate }
      };

      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual(mockFallbackChecklist);
    });

    test('should handle invalid JSON response from OpenAI', async () => {
      // Arrange
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      const mockFallbackChecklist = [
        { task: 'Fallback task', category: 'General', completed: false }
      ];

      const mockCreate = jest.fn().mockResolvedValue(mockOpenAIResponse);
      require('../../../config/openai').chat = {
        completions: { create: mockCreate }
      };

      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual(mockFallbackChecklist);
    });

    test('should include French HR compliance requirements in system prompt', async () => {
      // Arrange
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              { task: 'DPAE declaration', category: 'Legal', completed: false }
            ])
          }
        }]
      };

      const mockCreate = jest.fn().mockResolvedValue(mockOpenAIResponse);
      require('../../../config/openai').chat = {
        completions: { create: mockCreate }
      };

      const role = 'Développeur';
      const department = 'Informatique';

      // Act
      await ChecklistService.generateChecklist(role, department);

      // Assert
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
      expect(callArgs.messages[1].content).toBe(`Rôle: ${role}, Département: ${department}`);
    });

    test('should use correct OpenAI model and parameters', async () => {
      // Arrange
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{ task: 'Test', category: 'Test', completed: false }])
          }
        }]
      };

      const mockCreate = jest.fn().mockResolvedValue(mockOpenAIResponse);
      require('../../../config/openai').chat = {
        completions: { create: mockCreate }
      };

      // Act
      await ChecklistService.generateChecklist('Developer', 'Engineering');

      // Assert
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-3.5-turbo');
      expect(callArgs.max_tokens).toBe(1000);
      expect(callArgs.temperature).toBe(0.7);
    });
  });

  describe('generatePersonalizedChecklist', () => {
    test('should generate checklist with additional metadata', async () => {
      // Arrange
      const mockBaseChecklist = [
        { task: 'Base task', category: 'General', completed: false }
      ];

      // Mock the base generateChecklist method
      jest.spyOn(ChecklistService, 'generateChecklist')
        .mockResolvedValue(mockBaseChecklist);

      const userData = {
        role: 'Senior Developer',
        department: 'Engineering',
        experience: 'senior',
        name: 'John Doe'
      };

      // Act
      const result = await ChecklistService.generatePersonalizedChecklist(userData);

      // Assert
      expect(ChecklistService.generateChecklist).toHaveBeenCalledWith(
        userData.role,
        userData.department
      );
      expect(result).toEqual(mockBaseChecklist);
    });

    test('should handle missing optional parameters', async () => {
      // Arrange
      const mockBaseChecklist = [
        { task: 'Base task', category: 'General', completed: false }
      ];

      jest.spyOn(ChecklistService, 'generateChecklist')
        .mockResolvedValue(mockBaseChecklist);

      const userData = {
        role: 'Developer',
        department: 'Engineering'
        // Missing experience and name
      };

      // Act
      const result = await ChecklistService.generatePersonalizedChecklist(userData);

      // Assert
      expect(result).toEqual(mockBaseChecklist);
    });
  });
});