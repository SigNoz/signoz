import { expect, NAV_SHORTCUTS, test } from '../../drivers/shell';

test.describe('app shell — keyboard shortcuts', () => {
	for (const { combo, from, path, tab } of NAV_SHORTCUTS) {
		test(`TC-01 ${combo} opens ${path}`, async ({ shell }) => {
			await shell.goto(from);
			await expect(shell.nav.item('home')).toBeVisible();

			await shell.keys.press(combo);

			await expect.poll(() => shell.pathname()).toBe(path);
			expect(shell.url().searchParams.get('tab')).toBe(tab);
		});
	}

	test('TC-02 shortcuts are ignored while typing', async ({ shell }) => {
		await shell.goto('/dashboard');
		const search = shell.dashboardsSearch();
		await search.click();
		await shell.typeShifted('a');

		await expect(search).toHaveValue('A');
		expect(shell.pathname()).toBe('/dashboard');
	});
});

test.describe('app shell — sidebar toggle shortcut', () => {
	// `sidenav_pinned` is per user and settings/account.spec.ts toggles it on
	// admin2 in parallel, so this runs as the editor, which nothing else pins.
	test.use({ as: 'editor' });

	test.afterEach(async ({ shell }) => {
		await shell.users.setPreference('sidenav_pinned', true);
	});

	test('TC-03 shift+b toggles the sidebar pin and persists it', async ({
		shell,
	}) => {
		await shell.home.goto();
		// An unpinned nav expands on hover, which would mask the collapse.
		await shell.parkPointer();
		expect(await shell.nav.isCollapsed()).toBe(false);

		await shell.nav.toggleWithShortcut();
		await expect.poll(() => shell.nav.isCollapsed()).toBe(true);

		await shell.nav.reloadSettled();
		await expect(shell.nav.root()).toBeVisible();
		await shell.parkPointer();
		await expect.poll(() => shell.nav.isCollapsed()).toBe(true);

		await shell.nav.toggleWithShortcut();
		await expect.poll(() => shell.nav.isCollapsed()).toBe(false);
	});
});
