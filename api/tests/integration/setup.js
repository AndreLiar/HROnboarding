const request = require('supertest');
const app = require('../../server');
// const DatabaseService = require('../../services/databaseService'); // Reserved for future database testing

// Global test utilities for integration tests
global.testUtils = {
  // HTTP request helper
  request: request(app),

  // Rate limiting helper to prevent 429 errors
  async rateLimitedRequest(requestFn, delay = 200) {
    await new Promise(resolve => setTimeout(resolve, delay));
    return await requestFn();
  },

  // Sequential request helper
  async sequentialRequests(requests, delay = 300) {
    const results = [];
    for (let i = 0; i < requests.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const result = await requests[i]();
      results.push(result);
    }
    return results;
  },

  // Test database helpers
  async cleanDatabase() {
    try {
      // Clean up test data
      const sql = require('mssql');
      const request = new sql.Request();

      // Delete test checklists
      await request.query("DELETE FROM checklists WHERE slug LIKE 'test-%'");

      console.log('✅ Test database cleaned');
    } catch (error) {
      console.warn('⚠️ Database cleanup failed (may not exist yet):', error.message);
    }
  },

  // Test data generators
  generateTestChecklist() {
    return {
      role: 'Test Developer',
      department: 'Test Department',
      checklist: [{ étape: 'Test étape 1' }, { étape: 'Test étape 2' }, { étape: 'Test étape 3' }],
    };
  },

  generateTestSlug() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Mock OpenAI responses
  mockOpenAIResponse(customChecklist = null) {
    const mockChecklist = customChecklist || [
      { étape: "Accueil et présentation de l'équipe" },
      { étape: 'Formation aux outils internes' },
      { étape: "Configuration de l'environnement de travail" },
      { étape: 'Lecture de la documentation projet' },
      { étape: 'Premier code review' },
    ];

    return {
      choices: [
        {
          message: {
            content: JSON.stringify(mockChecklist),
          },
        },
      ],
      usage: {
        total_tokens: 150,
      },
    };
  },

  // Wait for async operations
  async waitFor(conditionFn, timeout = 5000, interval = 100) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // API response validators
  validateChecklistResponse(response) {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('checklist');
    expect(response.body.data).toHaveProperty('slug');
    expect(Array.isArray(response.body.data.checklist)).toBe(true);
  },

  validateErrorResponse(response, expectedStatus, expectedMessage = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');

    if (expectedMessage) {
      expect(response.body.error).toContain(expectedMessage);
    }
  },
};

// Setup and teardown
beforeEach(async () => {
  // Clean database before each test
  await global.testUtils.cleanDatabase();

  // Add longer delay to prevent rate limiting between tests
  await new Promise(resolve => setTimeout(resolve, 500)); // Increased to 500ms
});

afterAll(async () => {
  // Stop any pending database initialization timeouts
  const maxId = setTimeout(() => {}, 0);
  for (let id = 0; id <= maxId; id++) {
    clearTimeout(id);
    clearInterval(id);
  }

  // Final cleanup
  try {
    await global.testUtils.cleanDatabase();
  } catch (error) {
    // Ignore database cleanup errors in tests
  }

  // Close database connections
  try {
    const sql = require('mssql');
    await sql.close();
  } catch (error) {
    // Ignore database connection errors in tests
  }

  // Clear any remaining timers and connections
  if (global.gc) {
    global.gc();
  }

  // Minimal cleanup timeout
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 100);
    timeout.unref(); // Allow process to exit even if timeout is pending
  });
});
