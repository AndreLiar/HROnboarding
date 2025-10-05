import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock navigator.clipboard for Share component tests
beforeAll(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
});

// Mock window.location for URL tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
  },
  writable: true,
});

// Global test utilities
globalThis.testUtils = {
  // Common props for components
  createMockProps: (overrides = {}) => ({
    loading: false,
    readOnly: false,
    ...overrides,
  }),

  // Material UI theme wrapper
  createMockChecklist: (length = 3) =>
    Array.from({ length }, (_, i) => ({ étape: `Étape ${i + 1}` })),

  // Mock functions
  createMockFunction: () => vi.fn(),

  // Wait for async operations
  waitFor: (callback, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime >= timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, 50);
          }
        } catch (error) {
          reject(error);
        }
      };
      check();
    });
  },
};
