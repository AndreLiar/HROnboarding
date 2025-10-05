module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],

  // Coverage configuration - Focus on core tested files for CI validation
  collectCoverageFrom: [
    'controllers/checklistController.js',
    'controllers/statusController.js',
    'services/checklistService.js',
    'services/databaseService.js',
    '!**/node_modules/**',
    '!**/*.test.js',
    '!**/*.spec.js',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // High standards for tested files
    './controllers/checklistController.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './controllers/statusController.js': {
      branches: 50,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './services/checklistService.js': {
      branches: 75,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './services/databaseService.js': {
      branches: 75,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
