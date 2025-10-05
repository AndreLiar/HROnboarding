# API Unit Tests

This directory contains comprehensive unit tests for the HR Onboarding API.

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── unit/
│   ├── controllers/            # Controller tests
│   │   ├── checklistController.test.js
│   │   ├── statusController.test.js
│   │   └── templateController.test.js
│   └── services/              # Service tests
│       ├── databaseService.test.js
│       └── checklistService.test.js
└── README.md                  # This file
```

## Running Tests

### Local Development
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit
```

### CI/CD Pipeline
```bash
# CI-optimized test run (no watch, with coverage)
npm run test:ci
```

## Test Categories

### Controller Tests
- **checklistController.test.js**: Tests for checklist generation, sharing, and retrieval
- **statusController.test.js**: Tests for API status and health endpoints
- **templateController.test.js**: Tests for template CRUD operations

### Service Tests
- **databaseService.test.js**: Tests for database operations and connection handling
- **checklistService.test.js**: Tests for AI-powered checklist generation with fallbacks

## Coverage Thresholds

Current coverage requirements:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Utilities

Global test utilities are available via `global.testUtils`:

```javascript
// Create mock request object
const req = testUtils.createMockRequest({
  body: { role: 'Developer' },
  params: { id: '123' },
  user: { id: 'user123' }
});

// Create mock response object
const res = testUtils.createMockResponse();
```

## Environment Configuration

Tests use `.env.test` for environment variables. Key settings:
- `NODE_ENV=test`
- `DATABASE_TYPE=mock`
- Mock credentials for all external services

## Mocking Strategy

### External Services
- **OpenAI API**: Mocked to return predictable responses
- **Database**: Mocked with jest.mock('mssql')
- **Email Service**: Mocked to prevent actual email sends

### Test Data
All test data uses realistic but fake values:
- User IDs: 'test-user-id', 'user123'
- Templates: Minimal valid structures
- Checklists: Sample French HR compliance tasks

## Best Practices

1. **Isolation**: Each test is independent and cleans up after itself
2. **Mocking**: All external dependencies are mocked
3. **Assertions**: Tests verify both success and error cases
4. **Coverage**: All public methods have corresponding tests
5. **Realistic Data**: Test data reflects real-world usage patterns

## Debugging Tests

### Verbose Output
```bash
VERBOSE_TESTS=1 npm test
```

### Single Test File
```bash
npm test -- checklistController.test.js
```

### Debug Mode
```bash
npm test -- --detectOpenHandles --forceExit
```