module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns for integration tests
  testMatch: ['**/tests/integration/**/*.test.js', '**/tests/integration/**/*.spec.js'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],

  // Increased test timeout for rate limiting delays
  testTimeout: 60000, // Increased to 60 seconds

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

  // Run tests in strict sequence to avoid rate limiting
  maxWorkers: 1,

  // Ensure tests run serially
  runInBand: true,

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/integration',
};
