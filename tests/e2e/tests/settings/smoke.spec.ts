import { ADMIN, expect, test, type Settings } from '../../drivers/settings';

interface SettingsProbe {
	title: string;
	open(settings: Settings): Promise<void>;
	markers(settings: Settings): Promise<void>;
	/** Substrings of failed responses the page is known to produce. */
	allowFailures?: string[];
}

const PROBES: SettingsProbe[] = [
	{
		title: 'TC-01 /settings renders the workspace page',
		open: (settings) => settings.shell.goto('/settings'),
		markers: async (settings) => {
			await expect(settings.general.retentionTitle()).toBeVisible();
			await expect(settings.general.licenseCopyButton()).toBeVisible();
		},
	},
	{
		title: 'TC-02 /settings/org-settings shows the org name the API holds',
		open: (settings) => settings.org.goto(),
		markers: async (settings) => {
			await expect(settings.org.nameInput()).toHaveValue(
				await settings.org.apiName(),
			);
			await expect(settings.org.authDomainTitle()).toBeVisible();
		},
	},
	{
		title: 'TC-03 /settings/my-settings renders the preferences',
		open: (settings) => settings.account.goto(),
		markers: async (settings) => {
			await expect(settings.account.themeSelector()).toBeVisible();
			await expect(settings.account.timezoneAdaptationSwitch()).toBeVisible();
			await expect(settings.account.sidebarPinnedSwitch()).toBeVisible();
			await expect(settings.account.email(ADMIN.email)).toBeVisible();
		},
	},
	{
		title: 'TC-04 /settings/members lists the admin as active',
		open: (settings) => settings.members.goto(),
		markers: async (settings) => {
			await settings.members.search(ADMIN.email);
			await expect(settings.members.row(ADMIN.email)).toContainText('ACTIVE');
		},
	},
	{
		title: 'TC-05 /settings/roles lists the managed roles',
		open: (settings) => settings.roles.goto(),
		markers: async (settings) => {
			await settings.roles.search('signoz-');
			for (const role of ['signoz-admin', 'signoz-editor', 'signoz-viewer']) {
				await expect(settings.roles.row(role)).toBeVisible();
			}
		},
	},
	{
		title: 'TC-06 /settings/service-accounts renders the list',
		open: (settings) => settings.serviceAccounts.goto(),
		markers: async (settings) => {
			await expect(settings.serviceAccounts.newButton()).toBeVisible();
		},
	},
	{
		title: 'TC-07 /settings/ingestion-settings renders the keys page',
		open: async (settings) => {
			await settings.ingestion.stubGateway();
			await settings.ingestion.goto();
		},
		markers: async (settings) => {
			await expect(settings.ingestion.title()).toBeVisible();
			await expect(settings.ingestion.addButton()).toBeVisible();
		},
	},
	{
		title: 'TC-08 /settings/shortcuts lists every shortcut section',
		open: (settings) => settings.shortcutsPage.goto(),
		markers: async (settings) => {
			for (const section of [
				'Global Shortcuts',
				'Logs Explorer Shortcuts',
				'Query Builder Shortcuts',
				'Dashboard Shortcuts',
			]) {
				await expect(settings.shortcutsPage.section(section)).toBeVisible();
			}
		},
	},
	{
		title: 'TC-09 /settings/mcp-server shows the fallback without an MCP URL',
		open: (settings) => settings.mcp.goto(),
		markers: async (settings) => {
			await expect(settings.mcp.fallbackTitle()).toBeVisible();
		},
	},
	{
		title: 'TC-10 /settings/billing renders the billing page',
		open: (settings) => settings.billing.goto(),
		markers: async (settings) => {
			await expect(settings.billing.subtitle()).toBeVisible();
		},
	},
];

test.describe('settings — smoke', () => {
	for (const probe of PROBES) {
		test(probe.title, async ({ settings, noise }) => {
			await probe.open(settings);
			await probe.markers(settings);

			await expect(settings.errorBoundary()).toHaveCount(0);
			expect(noise.errors).toEqual([]);
			expect(
				noise.failedResponses.filter(
					(entry) =>
						!(probe.allowFailures ?? []).some((known) => entry.includes(known)),
				),
			).toEqual([]);
		});
	}
});

test.describe('settings — smoke as a viewer', () => {
	test.use({ as: 'viewer' });

	test('TC-11 the settings nav shows a viewer only what the backend grants', async ({
		settings,
	}) => {
		await settings.shell.goto('/settings');
		await expect(settings.shell.navItem('workspace')).toBeVisible();

		const keys = await settings.shell.navKeys();
		expect(keys).toEqual(
			expect.arrayContaining(['roles', 'service-accounts', 'keyboard-shortcuts']),
		);
		expect(keys).not.toContain('members');
		expect(keys).not.toContain('sso');
	});

	test('TC-12 a viewer on /settings/members gets no members page', async ({
		settings,
	}) => {
		// The members route sits inside the settings route, which every role may
		// open, so the guard does not redirect: the settings page simply mounts
		// no members tab for a viewer.
		await settings.shell.goto('/settings/members');
		await expect(settings.members.heading()).toHaveCount(0);
		expect(settings.pathname()).toBe('/settings/members');
		await expect(settings.errorBoundary()).toHaveCount(0);
	});
});
