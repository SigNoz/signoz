import { E2E_PASSWORD, expect, test } from '../../drivers/settings';

test.describe('settings — account as a seeded admin', () => {
	// Display name and `sidenav_pinned` belong to the user.
	test.use({ as: 'admin2' });

	test.afterEach(async ({ settings }) => {
		await settings.users.setPreference('sidenav_pinned', true);
	});

	test('TC-01 an updated name persists', async ({ settings }, testInfo) => {
		const name = `e2e admin2 w${testInfo.workerIndex} ${Date.now()}`;
		await settings.account.goto();

		await settings.account.rename(name);
		await expect(settings.account.userName()).toHaveText(name);

		await settings.reload();
		await expect(settings.account.userName()).toHaveText(name);
		expect((await settings.users.me()).displayName).toBe(name);
	});

	test('TC-04 the sidebar-pinned switch collapses the nav and persists', async ({
		settings,
	}) => {
		await settings.account.goto();
		await expect(settings.account.sidebarPinnedSwitch()).toHaveAttribute(
			'aria-checked',
			'true',
		);

		expect(await settings.account.toggleSidebarPinned()).toBe(false);
		await settings.sidenav.parkPointer();
		await expect.poll(() => settings.sidenav.isCollapsed()).toBe(true);

		await settings.reload();
		await expect(settings.account.sidebarPinnedSwitch()).toHaveAttribute(
			'aria-checked',
			'false',
		);
		await settings.sidenav.parkPointer();
		await expect.poll(() => settings.sidenav.isCollapsed()).toBe(true);

		await settings.sidenav.hover();

		expect(await settings.account.toggleSidebarPinned()).toBe(true);
	});
});

test.describe('settings — account password', () => {
	// A password change revokes the sessions of the user it runs as.
	test.use({
		user: async ({ throwaway }, use) => {
			await use(throwaway.user);
		},
	});

	test('TC-02 a changed password is the only one that works', async ({
		settings,
		authFlows,
		throwaway,
	}) => {
		const next = `${E2E_PASSWORD}-next`;
		await settings.account.goto();
		await settings.account.changePassword(E2E_PASSWORD, next);

		await authFlows.gotoLogin();
		await authFlows.enterEmail(throwaway.user.email);
		await authFlows.enterPassword(E2E_PASSWORD);
		await authFlows.submitPassword();
		await expect(authFlows.authError()).toBeVisible();

		await authFlows.login({ email: throwaway.user.email, password: next });
	});
});

test.describe('settings — account theme', () => {
	// The theme lives in localStorage, so it is scoped to this test's context.
	test('TC-03 the theme choice applies app-wide and survives a reload', async ({
		settings,
	}) => {
		await settings.account.goto();
		await settings.account.theme('light');
		await expect
			.poll(() => settings.account.appliedTheme())
			.toEqual({ light: true, stored: 'light' });

		await settings.goto('/dashboard');
		await expect
			.poll(() => settings.account.appliedTheme())
			.toEqual({ light: true, stored: 'light' });

		await settings.reload();
		await expect
			.poll(() => settings.account.appliedTheme())
			.toEqual({ light: true, stored: 'light' });
	});
});
