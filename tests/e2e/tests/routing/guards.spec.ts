import { expect, test } from '../../fixtures/auth';
import {
	historyDepth,
	LOGIN_PATH,
	SERVICES_PATH,
	submitLoginForm,
	urlOf,
} from '../../helpers/routing';

// The `<Redirect>` -> `<Navigate replace>` conversion, end to end. v5's
// `<Redirect>` replaces the history entry; v6's `<Navigate>` pushes unless told
// otherwise, and nothing about that difference is visible until someone presses
// Back. Runs on raw unauthenticated contexts — `authedPage` would skip the whole
// chain under test.

test.describe('Routing — auth guards', () => {
	test('TC-14 a deep-linked private route survives the login round trip', async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		try {
			await page.goto(SERVICES_PATH);
			await page.waitForURL((url) => url.pathname === LOGIN_PATH);
			expect(urlOf(page).pathname).toBe(LOGIN_PATH);

			await submitLoginForm(page);

			// Private.tsx stashed the requested path in UNAUTHENTICATED_ROUTE_HIT and
			// redirects back to it once `isLoggedIn` flips.
			await page.waitForURL((url) => url.pathname === SERVICES_PATH);
			expect(urlOf(page).pathname).toBe(SERVICES_PATH);
		} finally {
			await ctx.close();
		}
	});

	test('TC-15 the login redirects replace, so Back does not re-run the chain', async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		try {
			const depthBeforeGoto = await historyDepth(page);

			await page.goto(SERVICES_PATH);
			await page.waitForURL((url) => url.pathname === LOGIN_PATH);

			// The load added one entry and `<Redirect>` replaced it in place — a
			// pushing redirect (v6's `<Navigate>` default) would read one higher.
			// This is the assertion the `<Redirect>` -> `<Navigate replace>` rewrite
			// has to keep green.
			const depthAtLogin = await historyDepth(page);
			expect(depthAtLogin).toBe(depthBeforeGoto + 1);

			await submitLoginForm(page);
			await page.waitForURL((url) => url.pathname === SERVICES_PATH);

			// The post-login hop back to the stashed route does push, on v5 today.
			expect(await historyDepth(page)).toBe(depthAtLogin + 1);

			// So Back reaches the replaced /login entry — where being logged in
			// redirects straight out again, rather than re-running the login chain.
			await page.goBack();
			await expect
				.poll(() => urlOf(page).pathname, { timeout: 15_000 })
				.not.toBe(LOGIN_PATH);
			expect(urlOf(page).pathname).toBe(SERVICES_PATH);
		} finally {
			await ctx.close();
		}
	});
});
