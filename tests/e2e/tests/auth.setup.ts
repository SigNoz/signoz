// Runs once before all browser projects. Logs in and saves session to .auth/user.json
// so every test starts already authenticated — no per-test login needed.

import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const username = process.env.SIGNOZ_E2E_USERNAME;
  const password = process.env.SIGNOZ_E2E_PASSWORD;

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
    .waitFor({ state: 'visible', timeout: 30000 });

  await page.context().storageState({ path: authFile });
});
