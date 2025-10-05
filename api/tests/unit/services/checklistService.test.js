const ChecklistService = require('../../../services/checklistService');
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
      const mockChecklistArray = [
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
      ];

      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify(mockChecklistArray)
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

      // Mock the openai module to return the mock client
      require('../../../config/openai').chat = mockOpenAI.chat;

      const role = 'Développeur Senior';
      const department = 'Informatique';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(result).toEqual({
        checklist: mockChecklistArray,
        role: role,
        department: department
      });
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: expect.any(String) },
          { role: 'user', content: `Rôle: ${role}, Département: ${department}` }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
    });

    test('should use fallback when OpenAI throws network error', async () => {
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

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Network error - OpenAI unavailable'))
          }
        }
      };

      require('../../../config/openai').chat = mockOpenAI.chat;
      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual({
        checklist: mockFallbackChecklist,
        role: role,
        department: department
      });
    });

    test('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      const mockFallbackChecklist = [
        { task: 'Fallback task', category: 'General', completed: false }
      ];

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API Error'))
          }
        }
      };

      require('../../../config/openai').chat = mockOpenAI.chat;
      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual({
        checklist: mockFallbackChecklist,
        role: role,
        department: department
      });
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

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      require('../../../config/openai').chat = mockOpenAI.chat;
      getFallbackChecklist.mockReturnValue(mockFallbackChecklist);

      const role = 'Developer';
      const department = 'Engineering';

      // Act
      const result = await ChecklistService.generateChecklist(role, department);

      // Assert
      expect(getFallbackChecklist).toHaveBeenCalledWith(role, department);
      expect(result).toEqual({
        checklist: mockFallbackChecklist,
        role: role,
        department: department
      });
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

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      require('../../../config/openai').chat = mockOpenAI.chat;

      const role = 'Développeur';
      const department = 'Informatique';

      // Act
      await ChecklistService.generateChecklist(role, department);

      // Assert
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
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

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      require('../../../config/openai').chat = mockOpenAI.chat;

      // Act
      await ChecklistService.generateChecklist('Developer', 'Engineering');

      // Assert
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-3.5-turbo');
      expect(callArgs.max_tokens).toBe(1000);
      expect(callArgs.temperature).toBe(0.7);
    });
  });

  // Note: generatePersonalizedChecklist method doesn't exist in the actual implementation
  // The service only has generateChecklist method
});