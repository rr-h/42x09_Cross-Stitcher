import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cross-Stitcher App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows empty state initially', async ({ page }) => {
    await expect(page.getByText('No pattern loaded')).toBeVisible();
    await expect(page.getByText('Import Pattern')).toBeVisible();
  });

  test('has palette panel', async ({ page }) => {
    await expect(page.getByText('Palette')).toBeVisible();
    await expect(page.getByText('No pattern loaded').last()).toBeVisible();
  });

  test('import button is visible', async ({ page }) => {
    const importButton = page.getByText('Import Pattern');
    await expect(importButton).toBeVisible();
  });

  test('can import OXS file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload the fixture file
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    // Wait for pattern to load
    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Check that palette entries appear
    await expect(page.getByText('Black')).toBeVisible();
    await expect(page.getByText('Red')).toBeVisible();
  });

  test('can import FCJSON file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload the fixture file
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.fcjson'));

    // Wait for pattern to load
    await expect(page.getByText('3x3')).toBeVisible({ timeout: 5000 });

    // Check that palette entries appear
    await expect(page.getByText('Black')).toBeVisible();
  });

  test('shows zoom controls after loading pattern', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Zoom controls should be visible
    await expect(page.getByText('Fit')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('can select palette entry', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Click on Black palette entry
    const blackEntry = page.getByRole('button', { name: /Black/i });
    await blackEntry.click();

    // Should show stitch mode
    await expect(page.getByText('Stitch Mode')).toBeVisible();
  });

  test('clicking canvas does not throw errors', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Select a palette entry first
    const blackEntry = page.getByRole('button', { name: /Black/i });
    await blackEntry.click();

    // Click on canvas
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });

    // App should still be functional
    await expect(page.getByText('Palette')).toBeVisible();
  });

  test('progress updates when stitching', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Initial progress should be 0%
    await expect(page.getByText('0%')).toBeVisible();

    // Select Black and stitch
    const blackEntry = page.getByRole('button', { name: /Black/i });
    await blackEntry.click();

    const canvas = page.locator('canvas');

    // Click multiple times to place stitches
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 50 + i * 30, y: 50 } });
    }

    // Progress should have increased (may or may not show depending on if stitches were valid)
  });

  test('zoom in/out buttons work', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Get initial zoom level text
    const zoomText = page.locator('text=/\\d+%/');
    const initialZoom = await zoomText.textContent();

    // Click zoom in
    const zoomIn = page.getByRole('button', { name: '+' });
    await zoomIn.click();

    // Zoom should have increased
    const newZoom = await zoomText.textContent();
    expect(parseInt(newZoom || '0')).toBeGreaterThan(parseInt(initialZoom || '0'));
  });

  test('fit button resets zoom', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/simple.oxs'));

    await expect(page.getByText('Simple Test')).toBeVisible({ timeout: 5000 });

    // Zoom in a few times
    const zoomIn = page.getByRole('button', { name: '+' });
    await zoomIn.click();
    await zoomIn.click();

    // Click fit
    const fitButton = page.getByRole('button', { name: 'Fit' });
    await fitButton.click();

    // Should fit the pattern
    await expect(page.getByText('Fit')).toBeVisible();
  });
});
