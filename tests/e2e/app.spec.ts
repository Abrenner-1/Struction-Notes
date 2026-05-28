import { expect, test } from '@playwright/test';

test('loads the app shell', async ({ page }) => {
  await page.goto('/projects');

  await expect(page).toHaveTitle(/Struction Notes/i);
  await expect(page.getByRole('button', { name: /Continue as Guest/i })).toBeVisible();
});

test('direct project routes are served by the app', async ({ page }) => {
  await page.goto('/projects/route-check/tasks');

  await expect(page).toHaveTitle(/Struction Notes/i);
  await expect(page.getByRole('button', { name: /Continue as Guest/i })).toBeVisible();
});
