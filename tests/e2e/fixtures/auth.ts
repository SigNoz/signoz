import {
  test as base,
  expect,
  type Browser,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export type User = { email: string; password: string };

// Default user — admin from the pytest bootstrap (.env.local) or staging .env.
export const ADMIN: User = {
  email: process.env.SIGNOZ_E2E_USERNAME!,
  password: process.env.SIGNOZ_E2E_PASSWORD!,
};

// Per-worker storageState cache. One login per unique user per worker.
// Promise-valued so parallel fixture resolutions share the same in-flight work.
const storageByUser = new Map<string, Promise<string>>();

async function storageFor(browser: Browser, user: User): Promise<string> {
  const cached = storageByUser.get(user.email);
  if (cached) return cached;

  const task = (async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, user);
    const file = path.join(
      __dirname,
      '..',
      '.auth',
      `${safeName(user.email)}.json`,
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await ctx.storageState({ path: file });
    await ctx.close();
    return file;
  })();

  storageByUser.set(user.email, task);
  return task;
}

async function login(page: Page, user: User): Promise<void> {
  if (!user.email || !user.password) {
    throw new Error(
      'User credentials missing. Set SIGNOZ_E2E_USERNAME / SIGNOZ_E2E_PASSWORD ' +
        '(pytest bootstrap writes them to .env.local), or pass a User via test.use({ user: ... }).',
    );
  }
  await page.goto('/login?password=Y');
  await page.getByTestId('email').fill(user.email);
  await page.getByTestId('initiate_login').click();
  await page.getByTestId('password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in with Password' }).click();
  await page
    .getByText('Hello there, Welcome to your')
    .waitFor({ state: 'visible' });
}

const safeName = (s: string) => s.replace(/[^a-z0-9._-]/gi, '_');

export const test = base.extend<{
  /**
   * User identity for this test. Override with `test.use({ user: ... })` at
   * the describe or test level to run the suite as a different user.
   * Defaults to ADMIN (the pytest-bootstrap-seeded admin).
   */
  user: User;

  /**
   * A Page whose context is already authenticated as `user`. First request
   * for a given user triggers one login per worker; the resulting
   * storageState is cached and reused for all later requests.
   */
  authedPage: Page;
}>({
  user: [ADMIN, { option: true }],

  authedPage: async ({ browser, user }, use) => {
    const storageState = await storageFor(browser, user);
    const ctx = await browser.newContext({ storageState });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect };
