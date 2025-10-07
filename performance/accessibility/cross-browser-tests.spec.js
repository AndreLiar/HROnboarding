/**
 * Cross-Browser Accessibility and Performance Testing
 * Tests HR Onboarding application across different browsers
 */

const { test, expect, devices } = require('@playwright/test');

// Test configuration for different browsers and devices
const browsers = ['chromium', 'firefox', 'webkit'];
const viewport_sizes = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' }
];

// Base URL from environment or default
const BASE_URL = process.env.FRONTEND_URL || 'https://mango-pebble-0d01d2103.1.azurestaticapps.net';

// Accessibility tests across browsers
for (const browser of browsers) {
  test.describe(`${browser} - Accessibility Tests`, () => {
    
    test.use({ 
      browserName: browser,
      viewport: { width: 1280, height: 720 }
    });

    test('should have accessible landing page', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for basic accessibility landmarks
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      await expect(page.locator('h1, h2, h3')).toHaveCount.greaterThan(0);
      
      // Verify form labels are properly associated
      const roleSelect = page.locator('label:has-text("Rôle")');
      const deptSelect = page.locator('label:has-text("Département")');
      
      await expect(roleSelect).toBeVisible();
      await expect(deptSelect).toBeVisible();
      
      // Check for proper focus management
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Test tab navigation through form elements
      await page.keyboard.press('Tab'); // Role select
      await page.keyboard.press('Tab'); // Department select  
      await page.keyboard.press('Tab'); // Generate button
      
      // Verify button can be activated with keyboard
      const generateButton = page.locator('button:has-text("Générer")');
      await expect(generateButton).toBeFocused();
      
      // Test escape key functionality if modal/dropdown is open
      await page.keyboard.press('Escape');
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Use axe-core for automated accessibility testing
      await page.addInitScript(() => {
        window.axe = require('axe-core');
      });
      
      const results = await page.evaluate(() => {
        return window.axe.run({
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
          rules: {
            'color-contrast': { enabled: true }
          }
        });
      });
      
      // Log violations for debugging
      if (results.violations.length > 0) {
        console.log(`${browser} accessibility violations:`, results.violations);
      }
      
      // Expect no critical violations
      const criticalViolations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      expect(criticalViolations).toHaveLength(0);
    });
  });
}

// Performance tests across different viewport sizes
for (const viewport of viewport_sizes) {
  test.describe(`Performance Tests - ${viewport.name}`, () => {
    
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`should load quickly on ${viewport.name}`, async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Performance thresholds (adjust based on requirements)
      const maxLoadTime = viewport.name === 'mobile' ? 3000 : 2000;
      expect(loadTime).toBeLessThan(maxLoadTime);
      
      // Check for critical rendering path
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
    });

    test(`should be responsive on ${viewport.name}`, async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Verify responsive design elements
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Check that content doesn't overflow
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      
      // Allow for small differences due to scrollbars
      expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 20);
      
      // Verify mobile-specific behaviors
      if (viewport.name === 'mobile') {
        // Check that buttons are touch-friendly (minimum 44px)
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();
          if (box) {
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });
}

// Security-focused tests
test.describe('Security Tests', () => {
  
  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response.headers();
    
    // Check for security headers
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options', 
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    for (const header of securityHeaders) {
      if (headers[header]) {
        console.log(`✓ ${header}: ${headers[header]}`);
      } else {
        console.warn(`⚠ Missing security header: ${header}`);
      }
    }
    
    // At minimum, expect some basic security headers
    expect(
      headers['x-frame-options'] || 
      headers['content-security-policy'] ||
      headers['x-content-type-options']
    ).toBeTruthy();
  });

  test('should not expose sensitive information', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check page source for sensitive data
    const content = await page.content();
    
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /database.*connection/i
    ];
    
    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.warn(`⚠ Potentially sensitive information found: ${matches[0]}`);
      }
    }
    
    // Should not contain obvious sensitive keywords in source
    expect(content).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/i);
    expect(content).not.toMatch(/api[_-]?key\s*[:=]\s*["'][^"']+["']/i);
  });

  test('should handle invalid routes gracefully', async ({ page }) => {
    // Test 404 handling
    const response = await page.goto(`${BASE_URL}/non-existent-page`);
    
    // Should either redirect to main page or show proper 404
    expect([200, 404]).toContain(response.status());
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

// Checklist workflow tests
test.describe('Checklist Generation Workflow', () => {
  
  test('should complete full checklist generation flow', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Select role
    await page.selectOption('select[aria-labelledby*="role"], label:has-text("Rôle") + select, [id*="role"]', 'Développeur Junior');
    
    // Select department  
    await page.selectOption('select[aria-labelledby*="department"], label:has-text("Département") + select, [id*="department"]', 'Informatique');
    
    // Click generate button
    await page.click('button:has-text("Générer")');
    
    // Wait for results
    await page.waitForSelector('text=Checklist', { timeout: 10000 });
    
    // Verify checklist appears
    await expect(page.locator('text=Checklist')).toBeVisible();
    
    // Should have multiple checklist items
    const checklistItems = page.locator('li, .checklist-item');
    await expect(checklistItems).toHaveCount.greaterThan(0);
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Try to generate without selections
    await page.click('button:has-text("Générer")');
    
    // Button should be disabled or show validation
    const generateButton = page.locator('button:has-text("Générer")');
    const isDisabled = await generateButton.isDisabled();
    
    if (!isDisabled) {
      // If not disabled, should show some form of validation feedback
      await expect(page.locator('text=required, text=obligatoire, [aria-invalid="true"]')).toBeVisible();
    }
  });
});

module.exports = {};