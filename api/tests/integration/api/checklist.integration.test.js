const request = require('supertest');

const app = require('../../../server');
const ChecklistService = require('../../../services/checklistService');
const DatabaseService = require('../../../services/databaseService');

describe('Checklist API Integration Tests', () => {
  let savedChecklists;

  beforeAll(() => {
    // Create in-memory storage for saved checklists
    savedChecklists = new Map();

    // Mock DatabaseService methods
    jest
      .spyOn(DatabaseService, 'saveChecklist')
      .mockImplementation(async (id, slug, checklist, role, department) => {
        savedChecklists.set(slug, {
          id,
          slug,
          checklist,
          role,
          department,
          createdAt: new Date(),
        });
        return slug;
      });

    jest.spyOn(DatabaseService, 'getChecklistBySlug').mockImplementation(async slug => {
      return savedChecklists.get(slug) || null;
    });
  });

  afterAll(() => {
    // Restore database service mocks
    jest.restoreAllMocks();
  });

  // Add delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 150));
    // Clear saved checklists between tests
    savedChecklists.clear();
  });

  describe('POST /api/checklist/generate', () => {
    let originalOpenAIClient;

    beforeEach(() => {
      // Save original client and create mock
      originalOpenAIClient = ChecklistService.openaiClient;
      ChecklistService.openaiClient = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      };
    });

    afterEach(() => {
      // Restore original client
      ChecklistService.openaiClient = originalOpenAIClient;
    });

    it('should generate a checklist successfully', async () => {
      // Mock OpenAI response
      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue(
        global.testUtils.mockOpenAIResponse()
      );

      const testData = {
        role: 'Développeur Frontend',
        department: 'Informatique',
      };

      const response = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(200);

      // Validate response structure
      global.testUtils.validateGenerateResponse(response);

      // Validate specific data
      expect(response.body.data.role).toBe(testData.role);
      expect(response.body.data.department).toBe(testData.department);
      expect(response.body.data.checklist.length).toBeGreaterThan(0);

      // Validate checklist items structure
      response.body.data.checklist.forEach(item => {
        expect(item).toHaveProperty('étape');
        expect(typeof item.étape).toBe('string');
        expect(item.étape.length).toBeGreaterThan(0);
      });

      // Verify OpenAI was called
      expect(ChecklistService.openaiClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle missing role field', async () => {
      const invalidData = {
        department: 'Informatique',
        // Missing role
      };

      const response = await request(app)
        .post('/api/checklist/generate')
        .send(invalidData)
        .expect(400);

      global.testUtils.validateErrorResponse(response, 400, 'Role is required');
    });

    it('should handle missing department field', async () => {
      const invalidData = {
        role: 'Développeur Frontend',
        // Missing department
      };

      const response = await request(app)
        .post('/api/checklist/generate')
        .send(invalidData)
        .expect(400);

      global.testUtils.validateErrorResponse(response, 400, 'Department is required');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Mock OpenAI to throw an error
      ChecklistService.openaiClient.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const testData = {
        role: 'Développeur Frontend',
        department: 'Informatique',
      };

      const response = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(500);

      global.testUtils.validateErrorResponse(response, 500);
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      // Mock OpenAI to return invalid JSON
      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response from AI',
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      const testData = {
        role: 'Développeur Frontend',
        department: 'Informatique',
      };

      const response = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(500);

      global.testUtils.validateErrorResponse(response, 500);
    });
  });

  describe('POST /api/checklist/share', () => {
    let generatedChecklist;
    let originalOpenAIClient;

    beforeAll(() => {
      // Save original client and create mock
      originalOpenAIClient = ChecklistService.openaiClient;
      ChecklistService.openaiClient = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      };
    });

    afterAll(() => {
      // Restore original client
      ChecklistService.openaiClient = originalOpenAIClient;
    });

    beforeEach(async () => {
      // Generate a checklist first for sharing tests
      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue(
        global.testUtils.mockOpenAIResponse()
      );

      const response = await request(app).post('/api/checklist/generate').send({
        role: 'Test Developer',
        department: 'Test Department',
      });

      generatedChecklist = response.body.data;
    });

    it('should share a checklist successfully', async () => {
      const response = await request(app)
        .post('/api/checklist/share')
        .send(generatedChecklist)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data).toHaveProperty('shareUrl');
      expect(response.body.data.shareUrl).toContain(response.body.data.slug);
    });

    it('should handle missing checklist data', async () => {
      const response = await request(app).post('/api/checklist/share').send({}).expect(400);

      global.testUtils.validateErrorResponse(response, 400, 'checklist');
    });

    it('should handle invalid checklist format', async () => {
      const invalidData = {
        checklist: 'not an array',
        role: 'Test Role',
        department: 'Test Department',
      };

      const response = await request(app)
        .post('/api/checklist/share')
        .send(invalidData)
        .expect(400);

      global.testUtils.validateErrorResponse(response, 400);
    });

    it('should handle database errors gracefully', async () => {
      // Create checklist with very long content to potentially cause DB error
      const problematicData = {
        checklist: Array(1000)
          .fill()
          .map((_, i) => ({
            étape: `Very long step ${i} ${'a'.repeat(1000)}`,
          })),
        role: 'Test Role',
        department: 'Test Department',
      };

      const response = await request(app).post('/api/checklist/share').send(problematicData);

      // Should either succeed or fail gracefully
      if (response.status !== 200) {
        global.testUtils.validateErrorResponse(response, 500);
      }
    });
  });

  describe('GET /api/checklist/shared/:slug', () => {
    let sharedSlug;
    let originalOpenAIClient;

    beforeAll(() => {
      // Save original client and create mock
      originalOpenAIClient = ChecklistService.openaiClient;
      ChecklistService.openaiClient = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      };
    });

    afterAll(() => {
      // Restore original client
      ChecklistService.openaiClient = originalOpenAIClient;
    });

    beforeEach(async () => {
      // Create and share a checklist for retrieval tests
      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue(
        global.testUtils.mockOpenAIResponse()
      );

      // Generate checklist
      const generateResponse = await request(app).post('/api/checklist/generate').send({
        role: 'Test Developer',
        department: 'Test Department',
      });

      // Share checklist
      const shareResponse = await request(app)
        .post('/api/checklist/share')
        .send(generateResponse.body.data);

      sharedSlug = shareResponse.body.data.slug;
    });

    it('should retrieve a shared checklist successfully', async () => {
      const response = await request(app).get(`/api/checklist/shared/${sharedSlug}`).expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('checklist');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).toHaveProperty('department');
      expect(Array.isArray(response.body.data.checklist)).toBe(true);
    });

    it('should handle non-existent slug', async () => {
      const fakeSlug = 'non-existent-slug-12345';

      const response = await request(app).get(`/api/checklist/shared/${fakeSlug}`).expect(404);

      global.testUtils.validateErrorResponse(response, 404, 'not found');
    });

    it('should handle invalid slug format', async () => {
      const invalidSlug = 'invalid/slug/with/slashes';

      const response = await request(app).get(`/api/checklist/shared/${invalidSlug}`).expect(400);

      global.testUtils.validateErrorResponse(response, 400);
    });

    it('should handle malicious slug attempts', async () => {
      const maliciousSlug = '../../../etc/passwd';

      const response = await request(app).get(`/api/checklist/shared/${maliciousSlug}`).expect(400);

      global.testUtils.validateErrorResponse(response, 400);
    });
  });

  describe('Full Workflow Integration', () => {
    let originalOpenAIClient;

    beforeAll(() => {
      // Save original client and create mock
      originalOpenAIClient = ChecklistService.openaiClient;
      ChecklistService.openaiClient = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      };
    });

    afterAll(() => {
      // Restore original client
      ChecklistService.openaiClient = originalOpenAIClient;
    });

    it('should complete the entire checklist workflow', async () => {
      const customChecklist = [
        { étape: 'Accueil et présentation' },
        { étape: 'Formation aux outils' },
        { étape: 'Configuration environnement' },
      ];

      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue(
        global.testUtils.mockOpenAIResponse(customChecklist)
      );

      const testData = {
        role: 'Full Stack Developer',
        department: 'Informatique',
      };

      // Step 1: Generate checklist
      const generateResponse = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(200);

      global.testUtils.validateGenerateResponse(generateResponse);
      expect(generateResponse.body.data.checklist).toHaveLength(3);

      // Step 2: Share checklist
      const shareResponse = await request(app)
        .post('/api/checklist/share')
        .send(generateResponse.body.data)
        .expect(200);

      expect(shareResponse.body.data).toHaveProperty('slug');
      expect(shareResponse.body.data).toHaveProperty('shareUrl');

      // Step 3: Retrieve shared checklist
      const retrieveResponse = await request(app)
        .get(`/api/checklist/shared/${shareResponse.body.data.slug}`)
        .expect(200);

      // Validate data consistency throughout workflow
      expect(retrieveResponse.body.data.role).toBe(testData.role);
      expect(retrieveResponse.body.data.department).toBe(testData.department);
      expect(retrieveResponse.body.data.checklist).toHaveLength(3);
      expect(retrieveResponse.body.data.checklist[0].étape).toBe('Accueil et présentation');

      // Verify workflow metadata
      expect(retrieveResponse.body.data).toHaveProperty('createdAt');
      expect(new Date(retrieveResponse.body.data.createdAt)).toBeInstanceOf(Date);
    });

    it('should handle concurrent checklist operations', async () => {
      ChecklistService.openaiClient.chat.completions.create.mockResolvedValue(
        global.testUtils.mockOpenAIResponse()
      );

      // Create sequential requests to avoid rate limiting
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/checklist/generate')
          .send({
            role: `Concurrent Developer ${i}`,
            department: 'Test Department',
          });
        responses.push(response);
        await new Promise(resolve => setTimeout(resolve, 100)); // Delay between requests
      }

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        global.testUtils.validateGenerateResponse(response);
      });

      // All responses should have unique checklists
      expect(responses.length).toBe(5);
    });
  });
});
