import type { Browser, BrowserContext, Page } from '@playwright/test';

export type User = { email: string; password: string };

/** Default user — admin from the pytest bootstrap (.env.local) or staging .env. */
export const ADMIN: User = {
	email: process.env.SIGNOZ_E2E_USERNAME!,
	password: process.env.SIGNOZ_E2E_PASSWORD!,
};

/**
 * `browser.newContext()` only inherits `use.baseURL` while a *test* is in
 * scope. Worker-scoped fixtures (and their teardown) run outside that, where a
 * relative `page.goto('/login')` fails with "Cannot navigate to invalid URL" —
 * so pass it explicitly whenever we know it. Left empty when the var is unset
 * so the config's staging default still applies inside a test.
 */
const contextDefaults: { baseURL?: string } = process.env.SIGNOZ_E2E_BASE_URL
	? { baseURL: process.env.SIGNOZ_E2E_BASE_URL }
	: {};

// Per-worker storageState cache. One UI login per unique user per worker
// process, shared by everything in that worker: the `authedPage` fixture, the
// worker-scoped seed fixtures, and their teardown. Promise-valued so concurrent
// callers await the same in-flight login rather than racing several of their
// own. Held in memory only — no .auth/ dir, no JSON on disk.
//
// This cache is why `newAdminContext` is cheap. It used to log in through the
// UI on every call, and the alerts fixtures call it a dozen-plus times per
// worker (channel, rule list, five history seeds, one per owned rule, plus a
// teardown for each) — a couple of seconds each, paid over and over for a
// session that never changes.
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
const storageByUser = new Map<string, Promise<StorageState>>();

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

// Pin the nav suite-wide: unpinned it flies out on hover and overlays content.
// Server-side pref, so set once per user at login.
async function pinSidenav(page: Page): Promise<void> {
	const token = await page.evaluate(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		() => (globalThis as any).localStorage.getItem('AUTH_TOKEN') || '',
	);
	const res = await page.request.put('/api/v1/user/preferences/sidenav_pinned', {
		data: { value: true },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		const text = await res.text();
		// Two workers logging in at the same moment both insert the preference and
		// the loser gets a 500 on `uq_user_preference_name_user_id`. The write it
		// lost to set the same value, so the preference *is* pinned — treat the
		// duplicate as success rather than failing an unrelated test.
		if (text.includes('uq_user_preference_name_user_id')) {
			return;
		}
		throw new Error(
			`PUT /api/v1/user/preferences/sidenav_pinned ${res.status()}: ${text}`,
		);
	}
}

/**
 * Authenticated storage state for `user`, logging in once per worker. Callers
 * hand the result to `browser.newContext({ storageState })`.
 */
export function storageStateFor(
	browser: Browser,
	user: User = ADMIN,
): Promise<StorageState> {
	const cached = storageByUser.get(user.email);
	if (cached) {
		return cached;
	}

	const task = (async () => {
		const ctx = await browser.newContext(contextDefaults);
		const page = await ctx.newPage();
		await login(page, user);
		await pinSidenav(page);
		const state = await ctx.storageState();
		await ctx.close();
		return state;
	})();

	storageByUser.set(user.email, task);
	return task;
}

/**
 * Build an authenticated admin `BrowserContext`. Used by suite hooks
 * (`test.beforeAll` / `test.afterAll`) and worker-scoped fixtures, where the
 * test-scoped `authedPage` fixture from `fixtures/auth.ts` is not reachable.
 *
 * Reuses this worker's cached session, so only the first call in a worker pays
 * for a login. The caller owns the context and must close it.
 */
export async function newAdminContext(
	browser: Browser,
): Promise<BrowserContext> {
	return browser.newContext({
		...contextDefaults,
		storageState: await storageStateFor(browser, ADMIN),
	});
}
