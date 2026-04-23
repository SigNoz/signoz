import {
	test as base,
	expect,
	type Browser,
	type BrowserContext,
	type Page,
} from '@playwright/test';

export type User = { email: string; password: string };

// Default user — admin from the pytest bootstrap (.env.local) or staging .env.
export const ADMIN: User = {
	email: process.env.SIGNOZ_E2E_USERNAME!,
	password: process.env.SIGNOZ_E2E_PASSWORD!,
};

// Per-worker storageState cache. One login per unique user per worker.
// Promise-valued so concurrent requests share the same in-flight work.
// Held in memory only — no .auth/ dir, no JSON on disk.
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
const storageByUser = new Map<string, Promise<StorageState>>();

async function storageFor(browser: Browser, user: User): Promise<StorageState> {
	const cached = storageByUser.get(user.email);
	if (cached) return cached;

	const task = (async () => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await login(page, user);
		const state = await ctx.storageState();
		await ctx.close();
		return state;
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
	// Post-login lands somewhere different depending on whether the org is
	// licensed (onboarding flow on ENTERPRISE) or not (legacy "Hello there"
	// welcome). Wait for URL to move off /login — whichever page follows
	// is fine, each spec navigates to the feature under test anyway.
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

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
	 * storageState is held in memory and reused for all later requests.
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
