import { Page } from '@playwright/test';

// Read credentials from environment variables
const username = process.env.SIGNOZ_E2E_USERNAME;
const password = process.env.SIGNOZ_E2E_PASSWORD;

/**
 * Ensures the user is logged in.
 *
 * When storageState is configured in playwright.config.ts (the default), this
 * simply navigates to /home — the session is already restored from .auth/user.json
 * and no login form interaction is needed.
 *
 * Falls back to a full login flow if the session is missing or expired.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  // Fast path: session already active (storageState or prior navigation)
  if (page.url().includes('/home')) {
    return;
  }

  // Try navigating to home — if session is valid it lands there immediately
  await page.goto('/home');
  if (page.url().includes('/home')) {
    return;
  }

  // Session missing or expired — fall back to full login
  if (!username || !password) {
    throw new Error(
      'SIGNOZ_E2E_USERNAME and SIGNOZ_E2E_PASSWORD environment variables must be set.',
    );
  }

  await page.goto('/login?password=Y');
  await page.getByTestId('email').fill(username);
  await page.getByTestId('initiate_login').click();
  await page.getByTestId('password').fill(password);
  await page.getByRole('button', { name: 'Sign in with Password' }).click();
  await page
    .getByText('Hello there, Welcome to your')
    .waitFor({ state: 'visible' });
}
