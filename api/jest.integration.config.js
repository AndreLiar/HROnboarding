module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns for integration tests
  testMatch: ['**/tests/integration/**/*.test.js', '**/tests/integration/**/*.spec.js'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],

  // Test timeout for longer integration tests
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Coverage configuration for integration tests
  collectCoverageFrom: [
    'routes/**/*.js',
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/*.test.js',
    '!**/*.spec.js',
  ],

  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Verbose output for debugging
  verbose: true,

  // Run tests in sequence for database operations
  maxWorkers: 1,

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/integration',
};