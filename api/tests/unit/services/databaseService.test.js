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
    test('should save checklist with provided parameters', async () => {
      // Arrange
      const id = 'test123';
      const slug = 'test123';
      const checklist = [{ task: 'Test task', completed: false }];
      const role = 'Developer';
      const department = 'Engineering';

      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({})
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      const result = await DatabaseService.saveChecklist(id, slug, checklist, role, department);

      // Assert
      expect(result).toBe(slug);

      expect(mockRequest.input).toHaveBeenCalledWith('id', expect.any(Function), id);
      expect(mockRequest.input).toHaveBeenCalledWith('slug', expect.any(Function), slug);
      expect(mockRequest.input).toHaveBeenCalledWith('checklist', expect.any(Function), JSON.stringify(checklist));
      expect(mockRequest.input).toHaveBeenCalledWith('role', expect.any(Function), role);
      expect(mockRequest.input).toHaveBeenCalledWith('department', expect.any(Function), department);

      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checklists')
      );
    });

    test('should handle database save errors', async () => {
      // Arrange
      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValue(new Error('Insert failed'))
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act & Assert
      await expect(
        DatabaseService.saveChecklist('id', 'slug', [], 'Developer', 'Engineering')
      ).rejects.toThrow('Insert failed');
    });

    test('should handle missing parameters', async () => {
      // Arrange
      const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({})
      };

      sql.Request = jest.fn().mockReturnValue(mockRequest);

      // Act
      const result = await DatabaseService.saveChecklist('id', 'slug', [], null, null);

      // Assert
      expect(result).toBe('slug');
      expect(mockRequest.input).toHaveBeenCalledWith('role', expect.any(Function), null);
      expect(mockRequest.input).toHaveBeenCalledWith('department', expect.any(Function), null);
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
        checklist: [{ task: 'Test task', completed: false }], // Parsed JSON
        role: 'Developer',
        department: 'Engineering',
        createdAt: mockChecklistRow.createdAt
      });

      expect(mockRequest.input).toHaveBeenCalledWith('slug', expect.any(Function), slug);
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

  describe('testConnection', () => {
    test('should return Connected when connection succeeds', async () => {
      // Arrange
      const mockPool = { connected: true };
      sql.connect = jest.fn().mockResolvedValue(mockPool);

      // Act
      const result = await DatabaseService.testConnection();

      // Assert
      expect(result).toBe('Connected');
      expect(sql.connect).toHaveBeenCalled();
    });

    test('should return Disconnected when connection fails', async () => {
      // Arrange
      sql.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await DatabaseService.testConnection();

      // Assert
      expect(result).toBe('Disconnected');
    });
  });
});