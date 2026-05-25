import type { Browser, BrowserContext } from '@playwright/test';

/**
 * Build a fresh authenticated `BrowserContext` via UI login. Used by suite
 * hooks (`test.beforeAll` / `test.afterAll`), where the test-scoped
 * `authedPage` fixture from `fixtures/auth.ts` is not reachable.
 *
 * Each call performs one fresh login (~1s). The per-worker storageState
 * cache in `fixtures/auth.ts` is intentionally not shared here — keeping
 * this helper standalone avoids coupling suite hooks to the fixture's
 * private cache.
 */
export async function newAdminContext(
	browser: Browser,
): Promise<BrowserContext> {
	const email = process.env.SIGNOZ_E2E_USERNAME;
	const password = process.env.SIGNOZ_E2E_PASSWORD;
	if (!email || !password) {
		throw new Error(
			'SIGNOZ_E2E_USERNAME / SIGNOZ_E2E_PASSWORD must be set ' +
				'(pytest bootstrap writes them to .env.local).',
		);
	}
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.goto('/login?password=Y');
	await page.getByTestId('email').fill(email);
	await page.getByTestId('initiate_login').click();
	await page.getByTestId('password').fill(password);
	await page.getByRole('button', { name: 'Sign in with Password' }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
	await page.close();
	return ctx;
}
