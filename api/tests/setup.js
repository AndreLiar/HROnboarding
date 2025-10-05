// Jest test setup file
require('dotenv').config({ path: '.env.test' });

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_TYPE = 'mock';
process.env.OPENAI_API_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Console log suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console.log in tests unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
global.testUtils = {
  createMockRequest: (options = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 'test-user-id', role: 'user' },
    ...options
  }),
  
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }
};