import { test, expect } from '@playwright/test';

test.describe('ShipKit Test Bench', () => {
  test.setTimeout(120000);
  
  test('should discover components and generate a feature', async ({ page }) => {
    await page.goto('/');
    
    // Verify initial state
    await expect(page.locator('h1')).toContainText('ShipKit Test Bench');
    await page.screenshot({ path: 'e2e/screenshots/01-initial.png', fullPage: true });

    // Click Discover to find components
    await page.click('button:has-text("Discover")');
    await page.waitForTimeout(2000);
    
    // Wait for components to appear
    await expect(page.locator('text=Components')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/02-discovered.png', fullPage: true });

    // Fill in the feature form
    await page.fill('input[placeholder*="User Profile"]', 'User Dashboard');
    await page.fill('textarea[placeholder*="Describe"]', 'A dashboard showing user profile information with avatar, name, and account statistics');
    await page.fill('textarea[placeholder*="Display user"]', 'Display user avatar and name\nShow account statistics like posts and followers\nInclude action buttons for edit profile');
    await page.fill('textarea[placeholder*="User can"]', 'User can see their profile info\nStatistics are clearly visible');
    
    await page.screenshot({ path: 'e2e/screenshots/03-form-filled.png', fullPage: true });

    // Generate the feature
    await page.click('button:has-text("Generate")');
    
    // Wait for generation to complete - look for the Status card showing success
    await expect(page.locator('span:has-text("✓")')).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/04-generated-preview.png', fullPage: true });

    // Switch to Code view
    await page.click('button:has-text("Code")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/05-generated-code.png', fullPage: true });

    // Verify the generated code contains expected elements
    const codeContent = await page.locator('pre').textContent();
    expect(codeContent).toMatch(/User|Dashboard|Profile|Card/);
  });
});
