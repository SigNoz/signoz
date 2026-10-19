import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { alertSeeder } from './alerts/seed';
import { MISSING_METADATA } from './apm';
import { stubCloudOnlyApis, type ConsoleWatch } from './console';
import { dashboardsDriver, type DashboardSeed } from './dashboards';
import { driver, guestDriver, kit, type Layer } from './kit';
import { randomSpanId, randomTraceId, seedTracesViaSeeder } from './traces';
import { timePickerDriver, type TimePicker } from './timepicker';
import { usersApi, type UsersApi } from './users';

/**
 * The app shell: every top-level route, the side nav, its menus, the global
 * keyboard shortcuts, the top-nav time picker and Home.
 *
 * Per-user preferences (`sidenav_pinned`, `nav_shortcuts`, the
 * `welcome_checklist_*` flags) are server-side, so a spec that writes one runs
 * `as: 'admin2'`: the bootstrap admin's preferences are shared by every worker.
 */

/** A service the golden dataset always carries. */
export const GOLDEN_SERVICE = 'frontend';

export interface RouteProbe {
	/** Test title, `TC-NN <what>`. */
	title: string;
	path: string;
	/** Pathname the app must settle on. Defaults to `path` without its query. */
	expectPath?: string;
	/** Proof the route's own component rendered, read from its source. */
	marker(page: Page): Locator;
	/**
	 * Substrings of failed responses and console errors the route is known to
	 * produce. Each entry names the defect where the probe is declared.
	 */
	allowFailures?: string[];
	/** Console errors the route is known to log that carry no URL, such as axios's. */
	allowErrors?: string[];
	/** The route *is* the error fallback, so the boundary must be present. */
	expectBoundary?: boolean;
}

const byTestId =
	(id: string) =>
	(page: Page): Locator =>
		page.getByTestId(id);

const selectedTab =
	(name: string | RegExp) =>
	(page: Page): Locator =>
		page.getByRole('tab', { name, selected: true });

/**
 * One row per registered top-level route. Markers come from the component the
 * route mounts, so a row fails when that component stops rendering rather than
 * when some shared chrome does.
 */
export const ROUTES: RouteProbe[] = [
	{
		title: 'TC-01 /home renders the welcome view',
		path: '/home',
		marker: byTestId('home-page'),
	},
	{
		title: 'TC-02 /services renders the services table',
		path: '/services',
		marker: (page) => page.getByRole('columnheader', { name: 'Application' }),
	},
	{
		title: 'TC-03 /services/<service> renders the service overview',
		path: `/services/${GOLDEN_SERVICE}`,
		marker: selectedTab('Overview'),
		// The Apdex panel's metadata request, see `MISSING_METADATA`.
		allowFailures: [MISSING_METADATA],
	},
	{
		title: 'TC-04 /service-map renders the map container',
		path: '/service-map',
		// `modules/Servicemap` carries no testid; the container class is the
		// component's own root.
		marker: (page) => page.locator('.service-map-container'),
	},
	{
		title: 'TC-05 /logs/logs-explorer renders the explorer toolbar',
		path: '/logs/logs-explorer',
		marker: byTestId('search-view'),
	},
	{
		title: 'TC-06 /logs/pipelines renders the pipelines tab',
		path: '/logs/pipelines',
		// The route tab and the page's own inner tab are both "Pipelines".
		marker: (page) => selectedTab('Pipelines')(page).first(),
	},
	{
		title: 'TC-07 /logs/saved-views redirects to the logs explorer',
		path: '/logs/saved-views',
		expectPath: '/logs/logs-explorer',
		marker: byTestId('search-view'),
	},
	{
		title: 'TC-08 /traces-explorer renders the explorer toolbar',
		path: '/traces-explorer',
		marker: byTestId('trace-view'),
	},
	{
		title: 'TC-09 /traces/saved-views redirects to the traces explorer',
		path: '/traces/saved-views',
		expectPath: '/traces-explorer',
		marker: byTestId('trace-view'),
	},
	{
		title: 'TC-10 /traces/funnels renders the funnels header',
		path: '/traces/funnels',
		marker: (page) => page.getByText('Create and manage tracing funnels.'),
	},
	{
		title: 'TC-11 /metrics-explorer/summary renders the metrics search',
		path: '/metrics-explorer/summary',
		marker: byTestId('qb-search-container'),
	},
	{
		title: 'TC-12 /metrics-explorer/explorer renders the explorer header',
		path: '/metrics-explorer/explorer',
		marker: (page) => page.getByText('1 chart/query', { exact: true }),
	},
	{
		title: 'TC-13 /metrics-explorer/views redirects to the metrics explorer',
		path: '/metrics-explorer/views',
		expectPath: '/metrics-explorer/explorer',
		marker: (page) => page.getByText('1 chart/query', { exact: true }),
	},
	{
		title: 'TC-14 /infrastructure-monitoring/hosts renders the hosts list',
		path: '/infrastructure-monitoring/hosts',
		marker: (page) => page.getByTestId('quick-filters-toggle').first(),
	},
	{
		title: 'TC-15 /infrastructure-monitoring/kubernetes renders the entity rail',
		path: '/infrastructure-monitoring/kubernetes',
		marker: byTestId('category-pods'),
	},
	{
		title: 'TC-16 /integrations renders the integrations header',
		path: '/integrations',
		marker: (page) =>
			page.getByRole('heading', { name: 'Integrations', exact: true }),
	},
	{
		title: 'TC-17 /exceptions renders the exceptions table',
		path: '/exceptions',
		marker: (page) => page.getByRole('columnheader', { name: /Exception Type/ }),
	},
	{
		title: 'TC-18 /api-monitoring/explorer renders the domain list',
		path: '/api-monitoring/explorer',
		marker: (page) =>
			page
				.getByTestId('quick-filters-layout-content')
				.getByTestId('explorer-run-query-btn'),
	},
	{
		title: 'TC-19 /ai-observability/overview renders the overview',
		path: '/ai-observability/overview',
		marker: byTestId('llm-observability-overview'),
		// The dashboard toolbar asks for the public meta and an authz check under
		// the synthetic id `useSystemDashboard` assigns, and both answer 400.
		allowFailures: [
			'/api/v1/dashboards/llm-observability-overview/public',
			'/api/v1/authz/check',
		],
		allowErrors: ['Request failed with status code 400'],
	},
	{
		title: 'TC-20 /meter renders the meter tab',
		path: '/meter',
		marker: selectedTab(/Meter/),
	},
	{
		title: 'TC-21 /messaging-queues/overview renders the overview',
		path: '/messaging-queues/overview',
		marker: (page) => page.getByText('Messaging Queue Overview', { exact: true }),
	},
	{
		title: 'TC-22 /dashboard renders the dashboards list',
		path: '/dashboard',
		marker: byTestId('new-dashboard-cta'),
	},
	{
		title: 'TC-23 /alerts renders the alert rules tab',
		path: '/alerts',
		marker: selectedTab(/Alert Rules/),
	},
	{
		title: 'TC-24 /alerts?tab=Channels renders the channels list',
		path: '/alerts?tab=Channels',
		marker: (page) => page.getByRole('button', { name: /New Alert Channel/ }),
	},
	{
		title: 'TC-25 /status shows the running version',
		path: '/status',
		marker: (page) => page.getByPlaceholder('Current version'),
	},
	{
		title: 'TC-26 /support renders the support page',
		path: '/support',
		marker: byTestId('support-page-title'),
	},
	{
		title: 'TC-27 /onboarding renders the questionnaire',
		path: '/onboarding',
		marker: (page) =>
			page.getByRole('heading', { name: 'Welcome to SigNoz Cloud' }),
	},
	{
		title: 'TC-28 /get-started-with-signoz-cloud renders the data sources',
		path: '/get-started-with-signoz-cloud',
		marker: (page) => page.getByText('Select your data source').first(),
	},
	{
		title: 'TC-29 /un-authorized renders the restricted page',
		path: '/un-authorized',
		marker: (page) => page.getByRole('heading', { name: 'Access Restricted' }),
	},
	{
		title: 'TC-30 /something-went-wrong renders the error fallback',
		path: '/something-went-wrong',
		marker: byTestId('error-boundary-fallback'),
		expectBoundary: true,
	},
];

const homeMarker = byTestId('home-page');

export const HOME_PROBE: RouteProbe = {
	title: 'home',
	path: '/home',
	marker: homeMarker,
};

/** Routes the shell must send elsewhere on this stack. */
export const REDIRECTS: RouteProbe[] = [
	...[
		'/workspace-locked',
		'/workspace-suspended',
		'/workspace-access-restricted',
	].map(
		(path): RouteProbe => ({
			title: `TC-31 ${path} with a healthy license lands on /home`,
			path,
			expectPath: '/home',
			marker: homeMarker,
		}),
	),
	...['/ai-assistant', '/ai-assistant/00000000-0000-0000-0000-000000000000'].map(
		(path): RouteProbe => ({
			title: `TC-32 ${path} without an assistant URL lands on /home`,
			path,
			expectPath: '/home',
			marker: homeMarker,
		}),
	),
	{
		// `/licenses` is known to the route guard on every platform but only
		// mounted for self-hosted, so a cloud license falls through to NotFound.
		title: 'TC-33 /licenses on a cloud license renders not-found',
		path: '/licenses',
		marker: (page) => page.getByText('Page Not Found', { exact: true }),
	},
	{
		title: 'TC-34 an unknown path lands on /home',
		path: '/definitely-not-a-route',
		expectPath: '/home',
		marker: homeMarker,
	},
];

export interface NavShortcut {
	combo: string;
	/** Where the chord is pressed. Home, unless the chord itself goes there. */
	from: string;
	path: string;
	/** Expected `tab` query param, `null` for none. */
	tab: string | null;
}

const shortcut = (
	combo: string,
	path: string,
	tab: string | null = null,
): NavShortcut => ({
	combo,
	from: path === '/home' ? '/dashboard' : '/home',
	path,
	tab,
});

/** Global navigation shortcuts and where each one lands. */
export const NAV_SHORTCUTS: NavShortcut[] = [
	shortcut('shift+h', '/home'),
	shortcut('shift+s', '/services'),
	shortcut('shift+t', '/traces-explorer'),
	shortcut('shift+t+f', '/traces/funnels'),
	shortcut('shift+l', '/logs/logs-explorer'),
	shortcut('shift+l+p', '/logs/pipelines'),
	shortcut('shift+d', '/dashboard'),
	shortcut('shift+a', '/alerts'),
	shortcut('shift+e', '/exceptions'),
	shortcut('shift+q', '/messaging-queues/overview'),
	shortcut('shift+m', '/metrics-explorer/summary'),
	shortcut('shift+m+e', '/metrics-explorer/explorer'),
	shortcut('shift+g', '/settings'),
	shortcut('shift+g+i', '/settings/ingestion-settings'),
	shortcut('shift+g+b', '/settings/billing'),
	shortcut('shift+g+n', '/alerts', 'Channels'),
	shortcut('shift+g+k', '/settings/service-accounts'),
	shortcut('shift+g+r', '/settings/roles'),
	shortcut('shift+g+m', '/settings/members'),
];

/** Side-nav items and the pathname each one opens. */
export const NAV_ITEMS: { key: string; path: string }[] = [
	{ key: 'home', path: '/home' },
	{ key: 'alerts', path: '/alerts' },
	{ key: 'dashboards', path: '/dashboard' },
	{ key: 'services', path: '/services' },
	{ key: 'logs', path: '/logs/logs-explorer' },
	{ key: 'traces', path: '/traces-explorer' },
	{ key: 'metrics', path: '/metrics-explorer/summary' },
	{ key: 'infrastructure', path: '/infrastructure-monitoring/hosts' },
	{ key: 'integrations', path: '/integrations' },
	{ key: 'exceptions', path: '/exceptions' },
	{ key: 'external-apis', path: '/api-monitoring/explorer' },
	{ key: 'ai-observability', path: '/ai-observability/overview' },
	{ key: 'meter-explorer', path: '/meter' },
	{ key: 'messaging-queues', path: '/messaging-queues/overview' },
	{ key: 'service-map', path: '/service-map' },
];

export type HomeSection = 'alerts' | 'dashboards' | 'services' | 'saved-views';

/** Home checklist step ids, as `container/Home/constants.ts` names them. */
export type ChecklistStep =
	| 'SEND_LOGS'
	| 'SEND_TRACES'
	| 'SEND_METRICS'
	| 'SETUP_ALERTS'
	| 'SETUP_SAVED_VIEWS'
	| 'SETUP_DASHBOARDS';

/** `checkListStepToPreferenceKeyMap` in `container/Home/constants.ts`. */
const SKIP_PREFERENCE: Record<ChecklistStep, string> = {
	SEND_LOGS: 'welcome_checklist_send_logs_skipped',
	SEND_TRACES: 'welcome_checklist_send_traces_skipped',
	SEND_METRICS: 'welcome_checklist_send_metrics_skipped',
	SETUP_ALERTS: 'welcome_checklist_setup_alerts_skipped',
	SETUP_SAVED_VIEWS: 'welcome_checklist_setup_saved_view_skipped',
	SETUP_DASHBOARDS: 'welcome_checklist_setup_dashboards_skipped',
};

// The server registers `welcome_checklist_send_infra_metrics_skipped`, so it
// rejects this step's name with a 400 and the skip never persists.
const UNREGISTERED_STEPS: readonly ChecklistStep[] = ['SEND_METRICS'];

const DO_LATER_PREFERENCE = 'welcome_checklist_do_later';

const isPreferencePut =
	(name: string) =>
	(response: Response): boolean =>
		response.request().method() === 'PUT' &&
		response.url().includes(`/api/v1/user/preferences/${name}`);

export interface Shell {
	timePicker: TimePicker;
	users: UsersApi;

	goto(path: string): Promise<void>;
	reload(): Promise<void>;
	url(): URL;
	/** Move the pointer off the side nav, which expands on hover. */
	parkPointer(): Promise<void>;
	/** Stub the cloud control plane, open `probe.path` and wait for its marker. */
	visit(probe: RouteProbe): Promise<void>;
	pathname(): string;
	errorBoundary(): Locator;
	/** Console errors the probe does not name as known. */
	unexpectedErrors(noise: ConsoleWatch, probe: RouteProbe): string[];
	/** Failed responses the probe does not name as known. */
	unexpectedFailures(noise: ConsoleWatch, probe: RouteProbe): string[];

	nav: {
		root(): Locator;
		item(key: string): Locator;
		click(key: string): Promise<void>;
		pin(key: string): Promise<void>;
		unpin(key: string): Promise<void>;
		shortcutKeys(): Promise<string[]>;
		moreKeys(): Promise<string[]>;
		toggleMore(): Promise<void>;
		openManageShortcuts(): Promise<void>;
		/** The Manage Shortcuts rows, in their current order. */
		reorderRows(): Locator;
		reorderRow(key: string): Locator;
		/** Drag one Manage Shortcuts row onto another (dnd-kit pointer sensor). */
		dragShortcut(from: string, onto: string): Promise<void>;
		/** Save the modal. Returns the `nav_shortcuts` value the PUT sent. */
		saveShortcuts(): Promise<string[]>;
		isCollapsed(): Promise<boolean>;
		hover(): Promise<void>;
		/** Press `shift+b` and wait for the pin to be saved. */
		toggleWithShortcut(): Promise<void>;
		/** Reload and wait for the preferences list that overrides the cached pin. */
		reloadSettled(): Promise<void>;
	};

	helpMenu: {
		open(): Promise<void>;
		item(key: string): Locator;
		/** Click an external entry and return the URL of the tab it opens. */
		openExternal(key: string): Promise<string>;
	};

	userMenu: {
		open(): Promise<void>;
		item(testId: string): Locator;
		signOut(): Promise<void>;
	};

	keys: {
		/** Press a `+`-joined chord the way the hotkey hook reads it: on keyup. */
		press(combo: string): Promise<void>;
	};

	/** The `UTC …` offset badge in the time picker input. */
	timezoneBadge(): Locator;
	/** `PREFERRED_TIMEZONE` from localStorage. */
	storedTimezone(): Promise<string | null>;
	/** The My Settings note naming an overridden timezone. */
	timezoneOverrideNote(): Locator;
	clearTimezoneOverride(): Promise<void>;
	/**
	 * Resolves with the next `POST /api/v2/services` whose window is
	 * `minutes` wide, within a minute. Arm before the action that triggers it.
	 */
	nextServicesWindow(minutes: number): Promise<Request>;

	inviteDialog(): Locator;
	/** The dashboards list search: a CodeMirror editor, so assert its text. */
	dashboardsSearch(): Locator;
	/** Type one letter with Shift held, as a user typing a capital would. */
	typeShifted(letter: string): Promise<void>;

	home: {
		goto(): Promise<void>;
		checklist(): Locator;
		checklistItem(step: ChecklistStep): Locator;
		skipButton(step: ChecklistStep): Locator;
		/** Ids of the steps that still offer a "Skip for now" the server persists. */
		skippableSteps(): Promise<ChecklistStep[]>;
		skip(step: ChecklistStep): Promise<void>;
		doLater(): Promise<void>;
		checklistButton(): Locator;
		reopenChecklist(): Promise<void>;
		section(name: HomeSection): Locator;
		sectionEntry(name: HomeSection, text: string): Locator;
		explorerCard(label: string): Locator;
		/** Clear every `welcome_checklist_*` flag for the current user. */
		resetChecklistPrefs(): Promise<void>;
	};

	seedDashboard(title: string): Promise<DashboardSeed>;
	removeDashboard(id: string): Promise<void>;
	/**
	 * One alert rule and its channel. Test-scoped on purpose: Home lists the
	 * five most recently updated rules, and sibling workers keep adding more.
	 */
	seedAlertRule(name: string): Promise<AlertRuleSeed>;
	/**
	 * A root span just now, slow enough to lead Home's services widget, which
	 * ranks by p99 over the last 30 minutes and so cannot rely on the golden seed.
	 */
	seedSlowService(service: string): Promise<void>;
	removeAlertRule(seed: AlertRuleSeed): Promise<void>;
}

export interface AlertRuleSeed {
	channelId: string;
	ruleId: string;
	ruleName: string;
}

export function shellDriver(page: Page): Shell {
	const users = usersApi(page);
	const timePicker = timePickerDriver(page);

	const keyName = (part: string): string => {
		const lower = part.toLowerCase();
		if (lower === 'shift') {
			return 'Shift';
		}
		if (lower.length === 1 && /[a-z]/.test(lower)) {
			return `Key${lower.toUpperCase()}`;
		}
		return part;
	};

	const navKeysIn = async (section: string): Promise<string[]> => {
		const ids = await page
			.getByTestId(section)
			.locator('[data-testid^="nav-item-"]:not([data-testid^="nav-item-pin-"])')
			.evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('data-testid') ?? ''),
			);
		return ids.map((id) => id.replace(/^nav-item-/, ''));
	};

	const togglePin = async (key: string): Promise<void> => {
		const item = shell.nav.item(key);
		const saved = page.waitForResponse(isPreferencePut('nav_shortcuts'));
		await item.hover();
		await item.getByTestId(`nav-item-pin-${key}`).click();
		expect((await saved).ok()).toBe(true);
	};

	const shell: Shell = {
		timePicker,
		users,

		goto: async (path) => {
			await page.goto(path);
		},

		reload: async () => {
			await page.reload();
		},

		url: () => new URL(page.url()),

		parkPointer: async () => {
			const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
			await page.mouse.move(viewport.width - 10, viewport.height - 10);
		},

		visit: async (probe) => {
			await stubCloudOnlyApis(page);
			await page.goto(probe.path);
			await expect(probe.marker(page)).toBeVisible();
		},

		pathname: () => new URL(page.url()).pathname,

		errorBoundary: () => page.getByTestId('error-boundary-fallback'),

		unexpectedErrors: (noise, probe) =>
			noise.errors.filter(
				(entry) =>
					![...(probe.allowFailures ?? []), ...(probe.allowErrors ?? [])].some(
						(known) => entry.includes(known),
					),
			),

		unexpectedFailures: (noise, probe) =>
			noise.failedResponses.filter(
				(entry) =>
					!(probe.allowFailures ?? []).some((known) => entry.includes(known)),
			),

		nav: {
			root: () => page.getByTestId('sidenav'),
			item: (key) => page.getByTestId(`nav-item-${key}`),

			click: async (key) => {
				await shell.nav.item(key).click();
			},

			pin: (key) => togglePin(key),
			unpin: (key) => togglePin(key),

			shortcutKeys: () => navKeysIn('sidenav-shortcuts'),
			moreKeys: () => navKeysIn('sidenav-more'),

			toggleMore: async () => {
				const toggle = page.getByTestId('more-nav-toggle');
				const before = await toggle.getAttribute('aria-expanded');
				await toggle.click();
				await expect(toggle).not.toHaveAttribute('aria-expanded', before ?? '');
			},

			openManageShortcuts: async () => {
				await page.getByTestId('manage-shortcuts-btn').click();
				await expect(
					page.getByRole('dialog').filter({ hasText: 'Manage Shortcuts' }),
				).toBeVisible();
				// Rows measured mid zoom-in land the drag off target.
				await expect(
					page.locator('.ant-modal.ant-zoom-appear, .ant-modal.ant-zoom-enter'),
				).toHaveCount(0);
			},

			reorderRows: () => page.locator('[data-testid^="reorder-item-"]'),
			reorderRow: (key) => page.getByTestId(`reorder-item-${key}`),

			dragShortcut: async (from, onto) => {
				const source = await shell.nav.reorderRow(from).boundingBox();
				const target = await shell.nav.reorderRow(onto).boundingBox();
				if (!source || !target) {
					throw new Error(`reorder rows ${from} / ${onto} are not laid out`);
				}
				await page.mouse.move(
					source.x + source.width / 2,
					source.y + source.height / 2,
				);
				await page.mouse.down();
				// dnd-kit only starts a drag after the pointer has moved, and resolves
				// the drop target from intermediate positions.
				await page.mouse.move(
					source.x + source.width / 2,
					source.y + source.height / 2 - 5,
					{ steps: 3 },
				);
				await page.mouse.move(
					target.x + target.width / 2,
					target.y + target.height / 4,
					{ steps: 12 },
				);
				await page.mouse.up();
			},

			saveShortcuts: async () => {
				const saved = page.waitForResponse(isPreferencePut('nav_shortcuts'));
				await page.getByTestId('save-changes-btn').click();
				const response = await saved;
				expect(response.ok()).toBe(true);
				return (response.request().postDataJSON() as { value: string[] }).value;
			},

			toggleWithShortcut: async () => {
				const saved = page.waitForResponse(isPreferencePut('sidenav_pinned'));
				await shell.keys.press('shift+b');
				expect((await saved).ok()).toBe(true);
			},

			reloadSettled: async () => {
				const loaded = page.waitForResponse(
					(response) =>
						response.request().method() === 'GET' &&
						/\/api\/v1\/user\/preferences\/?(\?.*)?$/.test(response.url()),
				);
				await page.reload();
				await loaded;
			},

			isCollapsed: async () =>
				(await shell.nav.root().getAttribute('data-collapsed')) === 'true',

			hover: async () => {
				await shell.nav.root().hover();
				await expect(shell.nav.root()).toHaveAttribute('data-collapsed', 'false');
			},
		},

		helpMenu: {
			open: async () => {
				await page.getByTestId('help-support-nav-item').click();
			},
			item: (key) => page.getByTestId(`help-menu-${key}`),
			openExternal: async (key) => {
				// Served empty so the assertion does not depend on the internet.
				await page
					.context()
					.route(/^https:\/\/(signoz\.io|github\.com)\//, (route) =>
						route.fulfill({ status: 200, contentType: 'text/html', body: '' }),
					);
				const opened = page.context().waitForEvent('page');
				await shell.helpMenu.item(key).click();
				const tab = await opened;
				await tab.waitForURL((url) => url.protocol === 'https:');
				const url = tab.url();
				await tab.close();
				return url;
			},
		},

		userMenu: {
			open: async () => {
				await page.getByTestId('settings-nav-item').click();
				await expect(page.getByTestId('logout-nav-item')).toBeVisible();
			},
			item: (testId) => page.getByTestId(testId),
			signOut: async () => {
				await shell.userMenu.open();
				await page.getByTestId('logout-nav-item').click();
				await page.waitForURL((url) => url.pathname.startsWith('/login'));
			},
		},

		keys: {
			press: async (combo) => {
				// Hotkeys are ignored while an input or editor has focus, and several
				// pages focus one on mount.
				await page.evaluate(() => {
					(document.activeElement as HTMLElement | null)?.blur();
				});
				const parts = combo.split('+').map(keyName);
				for (const part of parts) {
					await page.keyboard.down(part);
				}
				for (const part of [...parts].reverse()) {
					await page.keyboard.up(part);
				}
			},
		},

		// The badge sits in the antd input's suffix, a sibling of the input that
		// carries the testid, and has no testid of its own.
		timezoneBadge: () =>
			page
				.locator('.ant-input-affix-wrapper', { has: timePicker.input() })
				.locator('.timezone-badge'),

		storedTimezone: () =>
			page.evaluate(() => localStorage.getItem('PREFERRED_TIMEZONE')),

		timezoneOverrideNote: () =>
			page.getByText('Your current timezone is overridden to'),

		clearTimezoneOverride: async () => {
			await page.getByTestId('timezone-clear-override').click();
			await expect(shell.timezoneOverrideNote()).toHaveCount(0);
		},

		nextServicesWindow: (minutes) =>
			page.waitForRequest((request) => {
				if (
					request.method() !== 'POST' ||
					new URL(request.url()).pathname !== '/api/v2/services'
				) {
					return false;
				}
				// `start` and `end` are nanosecond strings.
				const body = request.postDataJSON() as { start: string; end: string };
				const spanMinutes = (Number(body.end) - Number(body.start)) / 6e10;
				return Math.abs(spanMinutes - minutes) <= 1;
			}),

		inviteDialog: () => page.getByRole('dialog', { name: 'Invite Team Members' }),

		dashboardsSearch: () => page.getByPlaceholder('Filter views by name'),

		typeShifted: async (letter) => {
			await page.keyboard.down('Shift');
			await page.keyboard.press(`Key${letter.toUpperCase()}`);
			await page.keyboard.up('Shift');
		},

		home: {
			goto: async () => {
				await page.goto('/home');
				await expect(page.getByTestId('home-page')).toBeVisible();
			},

			checklist: () => page.getByTestId('home-checklist-card'),
			checklistItem: (step) =>
				shell.home.checklist().getByTestId(`checklist-item-${step}`),
			skipButton: (step) =>
				shell.home.checklist().getByTestId(`checklist-skip-${step}`),

			skippableSteps: async () => {
				const read = async (): Promise<ChecklistStep[]> => {
					const ids = await shell.home
						.checklist()
						.locator('[data-testid^="checklist-skip-"]')
						.evaluateAll((nodes) =>
							nodes.map((node) => node.getAttribute('data-testid') ?? ''),
						);
					return ids
						.map((id) => id.replace(/^checklist-skip-/, '') as ChecklistStep)
						.filter((step) => !UNREGISTERED_STEPS.includes(step));
				};
				// Steps complete one by one as the widget queries resolve, with no
				// loading marker, so the list is read once it stops changing. The poll
				// runs its first read at once, so that read only sets the baseline.
				let previous: string | undefined;
				await expect
					.poll(
						async () => {
							const current = (await read()).join();
							const settled = current === previous;
							previous = current;
							return settled;
						},
						{ intervals: [1_000], timeout: 15_000 },
					)
					.toBe(true);
				return read();
			},

			skip: async (step) => {
				const saved = page.waitForResponse(isPreferencePut(SKIP_PREFERENCE[step]));
				// A step's actions render only while it is hovered.
				await shell.home.checklistItem(step).hover();
				// The decorative checklist background covers the button at 1280px.
				await shell.home.skipButton(step).dispatchEvent('click');
				expect((await saved).ok()).toBe(true);
			},

			doLater: async () => {
				const saved = page.waitForResponse(isPreferencePut(DO_LATER_PREFERENCE));
				await page.getByTestId('checklist-do-later-btn').click();
				expect((await saved).ok()).toBe(true);
			},

			checklistButton: () => page.getByTestId('welcome-checklist-btn'),

			reopenChecklist: async () => {
				await shell.home.checklistButton().click();
				await expect(
					page.locator('.welcome-checklist-popover').getByText('Completed'),
				).toBeVisible();
			},

			// The widget cards are `periscope/components/Card`, which forwards no
			// testid, so the card is reached from the testid on its header.
			section: (name) =>
				page
					.locator('.home-data-card')
					.filter({ has: page.getByTestId(`home-section-${name}`) }),
			sectionEntry: (name, text) =>
				page
					.locator('.home-data-card')
					.filter({ has: page.getByTestId(`home-section-${name}`) })
					.getByText(text, { exact: true }),

			explorerCard: (label) => page.getByRole('button', { name: label }),

			resetChecklistPrefs: async () => {
				for (const name of [
					DO_LATER_PREFERENCE,
					...(Object.keys(SKIP_PREFERENCE) as ChecklistStep[])
						.filter((step) => !UNREGISTERED_STEPS.includes(step))
						.map((step) => SKIP_PREFERENCE[step]),
				]) {
					await users.setPreference(name, false);
				}
			},
		},

		seedDashboard: (title) => dashboardsDriver(page).create(title),
		removeDashboard: (id) => dashboardsDriver(page).remove(id),

		seedAlertRule: async (name) => {
			const seed = alertSeeder(page);
			const channel = await seed.channel(`${name}-ch`);
			const [ruleId] = await seed.rules({
				count: 1,
				channelName: channel.name,
				namePrefix: name,
			});
			return { channelId: channel.id, ruleId, ruleName: `${name}-00` };
		},

		seedSlowService: (service) =>
			seedTracesViaSeeder(page.request, [
				{
					timestamp: new Date(Date.now() - 5_000).toISOString(),
					trace_id: randomTraceId(),
					span_id: randomSpanId(),
					name: 'GET /home',
					kind: 2,
					duration: 'PT60S',
					resources: { 'service.name': service },
				},
			]),

		removeAlertRule: async ({ channelId, ruleId }) => {
			const seed = alertSeeder(page);
			await seed.deleteRules([ruleId]);
			await seed.deleteChannel(channelId);
		},
	};

	return shell;
}

/** A logged-out visitor, for the redirects only a guest sees. */
export interface ShellGuest {
	goto(path: string): Promise<void>;
	pathname(): string;
	emailInput(): Locator;
}

export function shellGuestDriver(page: Page): ShellGuest {
	return {
		goto: async (path) => {
			await page.goto(path);
		},
		pathname: () => new URL(page.url()).pathname,
		emailInput: () => page.getByTestId('email'),
	};
}

export const withShell: Layer<{ shell: Shell }> = driver('shell', ({ page }) =>
	shellDriver(page),
);

export const withShellGuest: Layer<{ guest: ShellGuest }> = guestDriver(
	'guest',
	({ page }) => shellGuestDriver(page),
);

/** The app-shell `test`. */
export const test = withShellGuest(withShell(kit));
export { ADMIN, expect } from './kit';
