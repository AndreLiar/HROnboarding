module.exports = {
  ci: {
    collect: {
      url: [
        'https://mango-pebble-0d01d2103.1.azurestaticapps.net',
        'https://mango-pebble-0d01d2103.1.azurestaticapps.net/c/test-checklist'
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: [
          'canonical', // Not applicable for SPA
          'crawlable-anchors', // Dynamic content
        ],
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Performance metrics
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 4000 }],
        
        // Bundle size
        'total-byte-weight': ['warn', { maxNumericValue: 1500000 }], // 1.5MB
        'unused-javascript': ['warn', { maxNumericValue: 200000 }], // 200KB
        
        // Best practices
        'uses-https': 'error',
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'aria-valid-attr': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
      reportFilenamePattern: 'lighthouse-report-%%PATHNAME%%-%%DATETIME%%.%%EXTENSION%%',
    },
    server: {
      port: 9009,
      storage: './performance/reports/lighthouse-storage',
    },
  },
};