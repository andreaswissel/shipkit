import { test, expect } from '@playwright/test';

test.describe('ShipKit Test Bench UI', () => {
  test('should capture initial state', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('ShipKit Test Bench');
    await page.screenshot({ path: 'e2e/screenshots/01-initial-state.png', fullPage: true });
  });

  test('should capture form interaction', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Fill in the form
    await page.getByLabel('Feature Name').fill('User Dashboard');
    await page.getByLabel('Description').fill('A dashboard showing user statistics and activity');
    await page.getByLabel('Requirements (one per line)').fill('- Show user stats\n- Display recent activity\n- Allow filtering');
    
    await page.screenshot({ path: 'e2e/screenshots/02-form-filled.png', fullPage: true });
  });

  test('should capture discover button click', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click the Discover button
    await page.getByRole('button', { name: 'Discover' }).click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'e2e/screenshots/03-after-discover.png', fullPage: true });
  });

  test('should capture code tab', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click the Code tab
    await page.getByRole('button', { name: 'Code' }).click();
    
    await page.screenshot({ path: 'e2e/screenshots/04-code-tab.png', fullPage: true });
  });
});
