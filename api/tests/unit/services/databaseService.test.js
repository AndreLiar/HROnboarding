const DatabaseService = require('../../../services/databaseService');
const sql = require('mssql');

// Mock mssql
jest.mock('mssql');
jest.mock('../../../config/database');

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    test('should connect to database and create table', async () => {
      // Arrange
      const mockRequest = {
        query: jest.fn().mockResolvedValue({})
      };
      
      sql.connect = jest.fn().mockResolvedValue({});
      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      await DatabaseService.initializeDatabase();

      // Assert
      expect(sql.connect).toHaveBeenCalledWith(expect.any(Object));
      expect(sql.Request).toHaveBeenCalled();
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE checklists')
      );
    });

    test('should handle connection errors gracefully', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      sql.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      // Act
      await DatabaseService.initializeDatabase();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Database connection failed:',
        expect.any(Error)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'App will continue without database functionality'
      );

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('saveChecklist', () => {
    test('should save checklist with generated ID and slug', async () => {
      // Arrange
      const mockChecklistData = {
        checklist: [{ task: 'Test task', completed: false }],
        metadata: {
          role: 'Developer',
          department: 'Engineering',
          name: 'John Doe'
        }
      };

      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({})
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      const result = await DatabaseService.saveChecklist(mockChecklistData);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('slug');
      expect(result.id).toHaveLength(12); // Generated slug length
      expect(result.slug).toBe(result.id);

      expect(mockRequest.input).toHaveBeenCalledWith('id', expect.any(String));
      expect(mockRequest.input).toHaveBeenCalledWith('slug', expect.any(String));
      expect(mockRequest.input).toHaveBeenCalledWith('checklist', expect.any(String));
      expect(mockRequest.input).toHaveBeenCalledWith('role', 'Developer');
      expect(mockRequest.input).toHaveBeenCalledWith('department', 'Engineering');

      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checklists')
      );
    });

    test('should handle database save errors', async () => {
      // Arrange
      const mockChecklistData = {
        checklist: [{ task: 'Test task', completed: false }],
        metadata: { role: 'Developer', department: 'Engineering' }
      };

      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValue(new Error('Insert failed'))
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act & Assert
      await expect(DatabaseService.saveChecklist(mockChecklistData))
        .rejects.toThrow('Insert failed');
    });

    test('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        // Missing checklist
        metadata: { role: 'Developer' }
      };

      // Act & Assert
      await expect(DatabaseService.saveChecklist(invalidData))
        .rejects.toThrow();
    });
  });

  describe('getChecklistBySlug', () => {
    test('should retrieve checklist by slug', async () => {
      // Arrange
      const slug = 'test123';
      const mockChecklistRow = {
        id: slug,
        slug: slug,
        checklist: JSON.stringify([{ task: 'Test task', completed: false }]),
        role: 'Developer',
        department: 'Engineering',
        createdAt: new Date('2023-01-01')
      };

      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [mockChecklistRow]
        })
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      const result = await DatabaseService.getChecklistBySlug(slug);

      // Assert
      expect(result).toEqual({
        id: slug,
        slug: slug,
        checklist: [{ task: 'Test task', completed: false }], // Parsed JSON
        metadata: {
          role: 'Developer',
          department: 'Engineering',
          createdAt: mockChecklistRow.createdAt
        }
      });

      expect(mockRequest.input).toHaveBeenCalledWith('slug', slug);
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM checklists WHERE slug = @slug')
      );
    });

    test('should return null for non-existent slug', async () => {
      // Arrange
      const slug = 'nonexistent';
      
      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [] // Empty result
        })
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      const result = await DatabaseService.getChecklistBySlug(slug);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle invalid JSON in checklist data', async () => {
      // Arrange
      const slug = 'test123';
      const mockChecklistRow = {
        id: slug,
        slug: slug,
        checklist: 'invalid json{',
        role: 'Developer',
        department: 'Engineering',
        createdAt: new Date('2023-01-01')
      };

      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [mockChecklistRow]
        })
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act & Assert
      await expect(DatabaseService.getChecklistBySlug(slug))
        .rejects.toThrow();
    });

    test('should handle database query errors', async () => {
      // Arrange
      const slug = 'test123';
      
      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValue(new Error('Query failed'))
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act & Assert
      await expect(DatabaseService.getChecklistBySlug(slug))
        .rejects.toThrow('Query failed');
    });
  });

  describe('generateSlug', () => {
    test('should generate alphanumeric slug of correct length', () => {
      // Act
      const slug = DatabaseService.generateSlug();

      // Assert
      expect(slug).toHaveLength(12);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });

    test('should generate different slugs on multiple calls', () => {
      // Act
      const slug1 = DatabaseService.generateSlug();
      const slug2 = DatabaseService.generateSlug();
      const slug3 = DatabaseService.generateSlug();

      // Assert
      expect(slug1).not.toBe(slug2);
      expect(slug2).not.toBe(slug3);
      expect(slug1).not.toBe(slug3);
    });
  });
});