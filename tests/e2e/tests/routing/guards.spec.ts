import { expect, PATH, test } from '../../drivers/routing';

// `<Redirect>` replaces the history entry and v7's `<Navigate>` pushes unless
// told otherwise, which only shows when someone presses Back. Runs as `guest`:
// an authenticated page would skip the chain under test.

test.describe('Routing — auth guards', () => {
	test('TC-14 a deep-linked private route survives the login round trip', async ({
		guest,
	}) => {
		await guest.goto(PATH.services);
		await guest.waitForPath(PATH.login);

		await guest.login();

		// Private.tsx stashed the requested path and redirects back to it.
		await guest.waitForPath(PATH.services);
		expect(guest.url().pathname).toBe(PATH.services);
	});

	test('TC-15 the login redirects replace, so Back does not re-run the chain', async ({
		guest,
	}) => {
		const depthBeforeGoto = await guest.historyDepth();

		await guest.goto(PATH.services);
		await guest.waitForPath(PATH.login);

		// A pushing redirect would read one higher.
		const depthAtLogin = await guest.historyDepth();
		expect(depthAtLogin).toBe(depthBeforeGoto + 1);

		await guest.login();
		await guest.waitForPath(PATH.services);
		expect(await guest.historyDepth()).toBe(depthAtLogin + 1);

		// Back reaches the replaced /login entry, where being logged in redirects
		// straight out again.
		await guest.goBack();
		await expect
			.poll(() => guest.url().pathname, { timeout: 15_000 })
			.not.toBe(PATH.login);
		expect(guest.url().pathname).toBe(PATH.services);
	});
});
