import { ADMIN, expect, test } from '../../drivers/auth-flows';

// Every test here signs in on a fresh guest context, which mints a new session
// and leaves the worker's cached admin session alone.

test.describe('auth — login', () => {
	test('TC-01 the admin signs in with email and password', async ({
		authFlows,
	}) => {
		// No `?password=Y`: the password step has to be offered on its own.
		await authFlows.gotoLogin();
		await authFlows.enterEmail(ADMIN.email);
		await authFlows.enterPassword(ADMIN.password);
		await authFlows.submitPassword();

		await expect.poll(() => authFlows.pathname()).not.toMatch(/^\/login/);
		await expect(authFlows.settingsNavItem()).toBeVisible();
	});

	test('TC-02 a wrong password shows the error and stays on /login', async ({
		authFlows,
	}) => {
		await authFlows.gotoLogin();
		await authFlows.enterEmail(ADMIN.email);
		await authFlows.enterPassword(`${ADMIN.password}-wrong`);
		await authFlows.submitPassword();

		await expect(authFlows.authError()).toBeVisible();
		expect(authFlows.pathname()).toBe('/login');
	});

	test('TC-03 a deep link survives the login round trip', async ({
		authFlows,
	}) => {
		await authFlows.goto('/alerts?tab=Channels');
		await authFlows.expectOnLogin();

		await authFlows.login(ADMIN);

		// The guard saves the pathname only, so the query does not survive.
		await expect.poll(() => authFlows.pathname()).toBe('/alerts');
	});

	test('TC-04 "Forgot password?" carries the email to the reset request', async ({
		authFlows,
		throwaway,
	}) => {
		// The bootstrap admin is the root user, which cannot reset its password.
		const { email } = throwaway.user;
		await authFlows.gotoLogin();
		await authFlows.enterEmail(email);
		await authFlows.forgotPasswordLink().click();

		await expect.poll(() => authFlows.pathname()).toBe('/forgot-password');
		await expect(authFlows.emailInput()).toBeDisabled();
		await expect(authFlows.emailInput()).toHaveValue(email);

		expect(await authFlows.submitForgot()).toBe(204);
		await expect(authFlows.forgotSuccess()).toBeVisible();

		await authFlows.backToLogin();
	});

	// Revocation is checked headless, in `passwordauthn/09_tokenizer.py`: here a
	// request the logout fires alongside it can re-cache the token.
	test('TC-05 signing out clears the session and returns to login', async ({
		authFlows,
		throwaway,
	}) => {
		await authFlows.login(throwaway.user);
		expect(await authFlows.storedToken()).not.toBeNull();

		await authFlows.signOut();
		expect(await authFlows.storedToken()).toBeNull();

		await authFlows.goto('/home');
		await authFlows.expectOnLogin();
	});
});
