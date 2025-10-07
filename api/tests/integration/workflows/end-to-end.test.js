const request = require('supertest');

// Mock OpenAI before importing the app
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

const app = require('../../../server');

describe('End-to-End Workflow Tests', () => {
  describe('Complete Checklist Lifecycle', () => {
    it('should complete the full workflow: generate → modify → share → retrieve', async () => {
      // Mock OpenAI response
      const { default: OpenAI } = require('openai');
      const mockOpenAI = new OpenAI();
      
      const originalChecklist = [
        { étape: 'Accueil et présentation de l\'équipe' },
        { étape: 'Formation aux outils internes' },
        { étape: 'Configuration de l\'environnement de travail' },
        { étape: 'Lecture de la documentation projet' },
        { étape: 'Premier code review' }
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(originalChecklist)
            }
          }
        ],
        usage: { total_tokens: 150 }
      });

      const testData = {
        role: 'Senior Full Stack Developer',
        department: 'Équipe Produit'
      };

      // Step 1: Generate initial checklist
      console.log('🔄 Step 1: Generating checklist...');
      const generateResponse = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(200);

      expect(generateResponse.body.success).toBe(true);
      expect(generateResponse.body.data.checklist).toHaveLength(5);
      expect(generateResponse.body.data.role).toBe(testData.role);
      expect(generateResponse.body.data.department).toBe(testData.department);
      
      console.log('✅ Step 1 completed: Checklist generated');

      // Step 2: Modify the checklist (simulate user editing)
      console.log('🔄 Step 2: Modifying checklist...');
      const modifiedChecklist = [
        ...generateResponse.body.data.checklist,
        { étape: 'Entretien avec le manager' },
        { étape: 'Planification des objectifs trimestriels' }
      ];

      const modifiedData = {
        ...generateResponse.body.data,
        checklist: modifiedChecklist
      };

      console.log('✅ Step 2 completed: Checklist modified (added 2 items)');

      // Step 3: Share the modified checklist
      console.log('🔄 Step 3: Sharing checklist...');
      const shareResponse = await request(app)
        .post('/api/checklist/share')
        .send(modifiedData)
        .expect(200);

      expect(shareResponse.body.success).toBe(true);
      expect(shareResponse.body.data).toHaveProperty('slug');
      expect(shareResponse.body.data).toHaveProperty('shareUrl');
      expect(shareResponse.body.data.shareUrl).toContain(shareResponse.body.data.slug);

      const sharedSlug = shareResponse.body.data.slug;
      console.log(`✅ Step 3 completed: Checklist shared with slug: ${sharedSlug}`);

      // Step 4: Retrieve the shared checklist
      console.log('🔄 Step 4: Retrieving shared checklist...');
      const retrieveResponse = await request(app)
        .get(`/api/checklist/shared/${sharedSlug}`)
        .expect(200);

      expect(retrieveResponse.body.success).toBe(true);
      expect(retrieveResponse.body.data.checklist).toHaveLength(7); // 5 original + 2 added
      expect(retrieveResponse.body.data.role).toBe(testData.role);
      expect(retrieveResponse.body.data.department).toBe(testData.department);

      // Verify data integrity throughout the workflow
      expect(retrieveResponse.body.data.checklist[5].étape).toBe('Entretien avec le manager');
      expect(retrieveResponse.body.data.checklist[6].étape).toBe('Planification des objectifs trimestriels');

      console.log('✅ Step 4 completed: Shared checklist retrieved successfully');
      console.log('🎉 End-to-end workflow completed successfully!');

      // Step 5: Verify metadata and timestamps
      expect(retrieveResponse.body.data).toHaveProperty('createdAt');
      const createdAt = new Date(retrieveResponse.body.data.createdAt);
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());

      console.log(`📊 Workflow metrics:
        - Original checklist items: 5
        - Modified checklist items: 7
        - Role: ${testData.role}
        - Department: ${testData.department}
        - Share slug: ${sharedSlug}
        - Created: ${createdAt.toISOString()}`);
    });

    it('should handle multiple concurrent workflows without interference', async () => {
      // Mock OpenAI for concurrent requests
      const { default: OpenAI } = require('openai');
      const mockOpenAI = new OpenAI();
      
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { étape: `Étape unique ${Date.now()}` },
                  { étape: `Étape spécifique ${Math.random()}` }
                ])
              }
            }
          ],
          usage: { total_tokens: 100 }
        })
      );

      // Create multiple concurrent workflows
      const workflows = Array(3).fill().map(async (_, index) => {
        const testData = {
          role: `Developer ${index}`,
          department: `Department ${index}`
        };

        console.log(`🔄 Starting workflow ${index + 1}...`);

        // Generate
        const generateResponse = await request(app)
          .post('/api/checklist/generate')
          .send(testData);

        expect(generateResponse.status).toBe(200);

        // Share
        const shareResponse = await request(app)
          .post('/api/checklist/share')
          .send(generateResponse.body.data);

        expect(shareResponse.status).toBe(200);

        // Retrieve
        const retrieveResponse = await request(app)
          .get(`/api/checklist/shared/${shareResponse.body.data.slug}`);

        expect(retrieveResponse.status).toBe(200);

        console.log(`✅ Workflow ${index + 1} completed`);

        return {
          index,
          slug: shareResponse.body.data.slug,
          data: retrieveResponse.body.data
        };
      });

      const results = await Promise.all(workflows);

      // Verify all workflows completed successfully and independently
      expect(results).toHaveLength(3);
      
      // All slugs should be unique
      const slugs = results.map(r => r.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(3);

      // All should have preserved their original data
      results.forEach((result, index) => {
        expect(result.data.role).toBe(`Developer ${index}`);
        expect(result.data.department).toBe(`Department ${index}`);
      });

      console.log('🎉 All concurrent workflows completed successfully!');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle workflow with API failures and recovery', async () => {
      const { default: OpenAI } = require('openai');
      const mockOpenAI = new OpenAI();

      // First attempt: API failure
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('OpenAI API temporarily unavailable'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { étape: 'Recovered step 1' },
                  { étape: 'Recovered step 2' }
                ])
              }
            }
          ],
          usage: { total_tokens: 75 }
        });

      const testData = {
        role: 'Recovery Test Developer',
        department: 'QA Department'
      };

      // First attempt should fail
      console.log('🔄 Testing API failure...');
      const failureResponse = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(500);

      expect(failureResponse.body.success).toBe(false);
      console.log('✅ API failure handled correctly');

      // Second attempt should succeed (recovery)
      console.log('🔄 Testing recovery...');
      const recoveryResponse = await request(app)
        .post('/api/checklist/generate')
        .send(testData)
        .expect(200);

      expect(recoveryResponse.body.success).toBe(true);
      expect(recoveryResponse.body.data.checklist).toHaveLength(2);
      console.log('✅ Recovery successful');

      // Continue with normal workflow
      const shareResponse = await request(app)
        .post('/api/checklist/share')
        .send(recoveryResponse.body.data)
        .expect(200);

      const retrieveResponse = await request(app)
        .get(`/api/checklist/shared/${shareResponse.body.data.slug}`)
        .expect(200);

      expect(retrieveResponse.body.data.role).toBe(testData.role);
      console.log('🎉 Recovery workflow completed successfully!');
    });

    it('should handle workflow with invalid data gracefully', async () => {
      // Test invalid generation request
      console.log('🔄 Testing invalid generation data...');
      const invalidGenerateResponse = await request(app)
        .post('/api/checklist/generate')
        .send({ role: '', department: '' }) // Invalid data
        .expect(400);

      expect(invalidGenerateResponse.body.success).toBe(false);
      console.log('✅ Invalid generation data rejected correctly');

      // Test invalid share request
      console.log('🔄 Testing invalid share data...');
      const invalidShareResponse = await request(app)
        .post('/api/checklist/share')
        .send({ checklist: 'not an array' }) // Invalid data
        .expect(400);

      expect(invalidShareResponse.body.success).toBe(false);
      console.log('✅ Invalid share data rejected correctly');

      // Test invalid retrieve request
      console.log('🔄 Testing invalid retrieve request...');
      const invalidRetrieveResponse = await request(app)
        .get('/api/checklist/shared/invalid-slug-format!@#')
        .expect(400);

      expect(invalidRetrieveResponse.body.success).toBe(false);
      console.log('✅ Invalid retrieve request rejected correctly');

      console.log('🎉 All error handling tests passed!');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume workflow operations', async () => {
      const { default: OpenAI } = require('openai');
      const mockOpenAI = new OpenAI();

      // Mock consistent responses for load testing
      mockOpenAI.chat.completions.create.mockImplementation(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { étape: 'Load test step 1' },
                  { étape: 'Load test step 2' }
                ])
              }
            }
          ],
          usage: { total_tokens: 80 }
        })
      );

      console.log('🔄 Starting load test with 10 concurrent workflows...');
      const startTime = Date.now();

      // Create 10 concurrent complete workflows
      const loadTestPromises = Array(10).fill().map(async (_, index) => {
        const testData = {
          role: `Load Test Role ${index}`,
          department: 'Load Test Department'
        };

        // Complete workflow: generate → share → retrieve
        const generateResponse = await request(app)
          .post('/api/checklist/generate')
          .send(testData);

        const shareResponse = await request(app)
          .post('/api/checklist/share')
          .send(generateResponse.body.data);

        const retrieveResponse = await request(app)
          .get(`/api/checklist/shared/${shareResponse.body.data.slug}`);

        return {
          index,
          generateTime: generateResponse.header['x-response-time'],
          shareTime: shareResponse.header['x-response-time'],
          retrieveTime: retrieveResponse.header['x-response-time'],
          success: retrieveResponse.status === 200
        };
      });

      const results = await Promise.all(loadTestPromises);
      const totalTime = Date.now() - startTime;

      // Verify all workflows completed successfully
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(10);

      console.log(`✅ Load test completed in ${totalTime}ms`);
      console.log(`📊 Success rate: ${successCount}/10 (${(successCount/10*100).toFixed(1)}%)`);
      console.log(`⚡ Average time per workflow: ${(totalTime/10).toFixed(1)}ms`);

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(successCount).toBe(10); // All should succeed
    });

    it('should maintain data consistency under load', async () => {
      const { default: OpenAI } = require('openai');
      const mockOpenAI = new OpenAI();

      mockOpenAI.chat.completions.create.mockImplementation(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { étape: 'Consistency test step' }
                ])
              }
            }
          ],
          usage: { total_tokens: 50 }
        })
      );

      console.log('🔄 Testing data consistency under concurrent operations...');

      // Create multiple workflows that modify the same type of data
      const consistencyPromises = Array(5).fill().map(async (_, index) => {
        const testData = {
          role: 'Consistency Test Role',
          department: `Department ${index}`
        };

        const generateResponse = await request(app)
          .post('/api/checklist/generate')
          .send(testData);

        // Add unique modification per workflow
        const modifiedData = {
          ...generateResponse.body.data,
          checklist: [
            ...generateResponse.body.data.checklist,
            { étape: `Unique step for workflow ${index}` }
          ]
        };

        const shareResponse = await request(app)
          .post('/api/checklist/share')
          .send(modifiedData);

        const retrieveResponse = await request(app)
          .get(`/api/checklist/shared/${shareResponse.body.data.slug}`);

        return {
          index,
          retrievedData: retrieveResponse.body.data,
          expectedUniqueStep: `Unique step for workflow ${index}`
        };
      });

      const results = await Promise.all(consistencyPromises);

      // Verify each workflow maintained its unique data
      results.forEach(result => {
        const uniqueStep = result.retrievedData.checklist.find(
          step => step.étape === result.expectedUniqueStep
        );
        expect(uniqueStep).toBeDefined();
        expect(result.retrievedData.department).toBe(`Department ${result.index}`);
      });

      console.log('✅ Data consistency maintained under load');
      console.log('🎉 All performance and load tests passed!');
    });
  });
});