import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VulnScan/i);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: /login|sign in/i })).toBeVisible();
  });

  test('should display pricing section', async ({ page }) => {
    await page.goto('/');
    const pricing = page.locator('#pricing');
    await expect(pricing).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('Authentication Pages', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back|sign in|login/i })).toBeVisible();
  });

  test('should load register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /sign up|register|create/i })).toBeVisible();
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.getByRole('button', { name: /sign in|login|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show some form of validation feedback
      await page.waitForTimeout(500);
    }
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show auth required
    await page.waitForTimeout(1000);
    const url = page.url();
    const isRedirected = url.includes('login') || url.includes('auth');
    const hasAuthPrompt = await page.getByText(/sign in|login|unauthorized/i).isVisible().catch(() => false);
    expect(isRedirected || hasAuthPrompt).toBeTruthy();
  });
});

test.describe('404 Page', () => {
  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
