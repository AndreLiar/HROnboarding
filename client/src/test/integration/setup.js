import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock API handlers
const apiHandlers = [
  // Generate checklist endpoint
  http.post('/api/checklist/generate', async ({ request }) => {
    const body = await request.json();
    
    if (!body.role || !body.department) {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Role and department are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return HttpResponse.json({
      success: true,
      data: {
        checklist: [
          { étape: 'Accueil et présentation de l\'équipe' },
          { étape: 'Formation aux outils internes' },
          { étape: 'Configuration de l\'environnement de travail' },
          { étape: 'Lecture de la documentation projet' },
          { étape: 'Premier code review' }
        ],
        role: body.role,
        department: body.department,
        slug: `test-slug-${Date.now()}`
      }
    });
  }),

  // Share checklist endpoint
  http.post('/api/checklist/share', async ({ request }) => {
    const body = await request.json();
    
    if (!body.checklist || !Array.isArray(body.checklist)) {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Valid checklist is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slug = `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return HttpResponse.json({
      success: true,
      data: {
        slug,
        shareUrl: `${window.location.origin}/c/${slug}`
      }
    });
  }),

  // Get shared checklist endpoint
  http.get('/api/checklist/shared/:slug', ({ params }) => {
    const { slug } = params;
    
    if (slug === 'non-existent') {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Checklist not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        checklist: [
          { étape: 'Accueil et présentation de l\'équipe' },
          { étape: 'Formation aux outils internes' },
          { étape: 'Configuration de l\'environnement de travail' }
        ],
        role: 'Shared Developer',
        department: 'Shared Department',
        createdAt: new Date().toISOString()
      }
    });
  }),

  // Health endpoint
  http.get('/health', () => {
    return HttpResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'HR Onboarding API is healthy',
      version: '1.0.0',
      uptime: 123.45
    });
  }),

  // Error simulation endpoint
  http.post('/api/checklist/error', () => {
    return new HttpResponse(
      JSON.stringify({
        success: false,
        error: 'Simulated server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  })
];

// Setup MSW server
const server = setupServer(...apiHandlers);

// Global test utilities for integration tests
globalThis.testUtils = {
  ...globalThis.testUtils,
  
  // MSW server controls
  server,
  
  // Mock API responses
  mockApiError: (endpoint, status = 500, message = 'Server error') => {
    server.use(
      http.all(endpoint, () => {
        return new HttpResponse(
          JSON.stringify({
            success: false,
            error: message
          }),
          { status, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
  },

  mockApiSuccess: (endpoint, method = 'get', data = {}) => {
    const handler = method === 'post' ? http.post : 
                   method === 'put' ? http.put :
                   method === 'delete' ? http.delete :
                   http.get;
    
    server.use(
      handler(endpoint, () => {
        return HttpResponse.json({
          success: true,
          data
        });
      })
    );
  },

  // Test data generators
  createMockChecklist: (count = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      étape: `Test étape ${i + 1}`
    }));
  },

  createMockGenerateRequest: () => ({
    role: 'Test Developer',
    department: 'Test Department'
  }),

  // Wait for API calls
  waitForApiCall: async (timeout = 5000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (Date.now() - start >= timeout) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  // Network simulation
  simulateSlowNetwork: (delay = 2000) => {
    server.use(
      http.all('*', async ({ request }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return HttpResponse.json({ delayed: true });
      })
    );
  },

  simulateNetworkError: () => {
    server.use(
      http.all('*', () => {
        return HttpResponse.error();
      })
    );
  },

  // Reset to default handlers
  resetHandlers: () => {
    server.resetHandlers(...apiHandlers);
  }
};

// Setup and teardown
beforeAll(() => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  // Reset any request handlers that were added during tests
  server.resetHandlers();
});

afterAll(() => {
  // Clean up MSW server
  server.close();
});

// Enhanced clipboard mock for integration tests
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('mocked clipboard content')),
  },
});

// Mock window.location with more realistic behavior
delete window.location;
window.location = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};