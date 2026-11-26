import { ADMIN, expect, NAV_ITEMS, test } from '../../drivers/shell';

test.describe('app shell — side nav', () => {
	for (const { key, path } of NAV_ITEMS) {
		test(`TC-01 the ${key} nav item opens ${path}`, async ({ shell }) => {
			await shell.home.goto();
			await shell.nav.click(key);
			await expect.poll(() => shell.pathname()).toBe(path);
		});
	}

	test('TC-04 the help menu invite entry opens the invite dialog', async ({
		shell,
	}) => {
		await shell.home.goto();
		await shell.helpMenu.open();
		await shell.helpMenu.item('invite-collaborators').click();

		await expect.poll(() => shell.pathname()).toBe('/settings/members');
		expect(shell.url().searchParams.get('invite')).toBe('true');
		await expect(shell.inviteDialog()).toBeVisible();
	});

	test('TC-05 the help menu documentation entry opens the docs', async ({
		shell,
	}) => {
		await shell.home.goto();
		await shell.helpMenu.open();
		expect(await shell.helpMenu.openExternal('documentation')).toBe(
			'https://signoz.io/docs',
		);
	});

	test('TC-06 the user menu names the user and routes to each settings page', async ({
		shell,
	}) => {
		const destinations = [
			{ item: 'workspace-settings-nav-item', path: '/settings' },
			{ item: 'account-settings-nav-item', path: '/settings/my-settings' },
			{ item: 'keyboard-shortcuts-nav-item', path: '/settings/shortcuts' },
		];

		await shell.home.goto();
		await shell.userMenu.open();
		await expect(shell.userMenu.item('logged-in-as-nav-item')).toContainText(
			ADMIN.email,
		);
		// A cloud license manages billing, not a license key.
		await expect(shell.userMenu.item('manage-license-nav-item')).toHaveCount(0);

		for (const { item, path } of destinations) {
			await shell.home.goto();
			await shell.userMenu.open();
			await shell.userMenu.item(item).click();
			await expect.poll(() => shell.pathname()).toBe(path);
		}
	});
});

test.describe('app shell — side nav shortcuts', () => {
	// `nav_shortcuts` is a per-user preference.
	test.use({ as: 'admin2' });

	test.afterEach(async ({ shell }) => {
		await shell.users.setPreference('nav_shortcuts', []);
	});

	test('TC-02 pinning a More item moves it to Shortcuts and persists', async ({
		shell,
	}) => {
		await shell.home.goto();
		await expect(shell.nav.item('exceptions')).toBeVisible();
		expect(await shell.nav.moreKeys()).toContain('exceptions');

		await shell.nav.pin('exceptions');
		await expect.poll(() => shell.nav.shortcutKeys()).toContain('exceptions');
		expect(await shell.nav.moreKeys()).not.toContain('exceptions');

		await shell.reload();
		await expect(shell.nav.item('exceptions')).toBeVisible();
		await expect.poll(() => shell.nav.shortcutKeys()).toContain('exceptions');
		expect(await shell.nav.moreKeys()).not.toContain('exceptions');

		await shell.nav.unpin('exceptions');
		await expect.poll(() => shell.nav.moreKeys()).toContain('exceptions');
		expect(await shell.nav.shortcutKeys()).not.toContain('exceptions');
	});

	test('TC-03 Manage Shortcuts saves a new order', async ({ shell }) => {
		await shell.home.goto();
		await expect(shell.nav.item('services')).toBeVisible();
		const before = await shell.nav.shortcutKeys();
		expect(before.length).toBeGreaterThan(1);
		const [first, second] = before;

		await shell.nav.openManageShortcuts();
		await shell.nav.dragShortcut(second, first);
		const sent = await shell.nav.saveShortcuts();

		const expected = [second, first, ...before.slice(2)];
		expect(sent).toEqual(expected);

		await shell.reload();
		await expect(shell.nav.item(second)).toBeVisible();
		await expect.poll(() => shell.nav.shortcutKeys()).toEqual(expected);
	});
});
