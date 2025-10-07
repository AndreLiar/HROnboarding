/**
 * axe-core Configuration for HR Onboarding Application
 * WCAG 2.1 AA Compliance Testing
 */

module.exports = {
  // Target WCAG 2.1 AA compliance
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  
  // Test configuration
  rules: {
    // Enforce color contrast requirements
    'color-contrast': { enabled: true },
    
    // Ensure proper heading structure
    'heading-order': { enabled: true },
    
    // Require alt text for images
    'image-alt': { enabled: true },
    
    // Ensure form labels are properly associated
    'label': { enabled: true },
    
    // Check keyboard navigation
    'keyboard-trap': { enabled: true },
    'focus-order-semantics': { enabled: true },
    
    // Language detection
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    
    // Skip certain rules that might not apply to SPA
    'bypass': { enabled: false }, // Skip for SPA navigation
    'region': { enabled: false }   // Skip for dynamic content
  },
  
  // Configure test environment
  options: {
    outputDir: './accessibility/reports',
    timeout: 30000,
    viewport: {
      width: 1280,
      height: 720
    }
  },
  
  // Test specific pages
  urls: [
    '/', // Landing page
    '/c/test-checklist', // Shared checklist view
    '/generate' // Generation form
  ],
  
  // Reporter configuration
  reporter: 'html',
  outputFormat: 'json'
};