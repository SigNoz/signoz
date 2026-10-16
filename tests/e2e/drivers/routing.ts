/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { randomBytes } from 'crypto';

import { expect, type Locator, type Page } from '@playwright/test';

import { ADMIN } from '../helpers/auth';
import { authToken } from '../helpers/common';
import {
	createDashboardViaApi,
	deleteDashboardViaApi,
} from '../helpers/dashboards';
import { seedPodMetricsViaSeeder } from '../helpers/infra-monitoring';
import { gotoLogsExplorer } from '../helpers/logs-explorer';
import {
	gotoTraceUntilLoaded,
	type LargeTrace,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../helpers/trace-details';

import { driver, kit, seeded } from './kit';

// The react-router v5 -> v7 regression net. Router-sensitive mechanics (history
// depth, POP, same-url suppression, the `newTab` branch) live here so the specs
// read as the property they guard.

export const PATH = {
	alerts: '/alerts',
	dashboards: '/dashboard',
	home: '/home',
	k8s: '/infrastructure-monitoring/kubernetes',
	login: '/login',
	metricsSummary: '/metrics-explorer/summary',
	metricsViews: '/metrics-explorer/views',
	roles: '/settings/roles',
	roleCreate: '/settings/roles/new',
	services: '/services',
	tracesExplorer: '/traces-explorer',
	/** Matches no entry of `AppRoutes/routes.ts`. */
	unknown: '/definitely-not-a-route',
} as const;

/** A resource attribute every seeded pod carries. */
const NAMESPACE_ATTR = 'k8s.namespace.name';

const RELATIVE_TIME_LABELS: Record<string, string> = {
	'30m': 'Last 30 minutes',
	'1h': 'Last 1 hour',
	'6h': 'Last 6 hours',
};

/** Three browser projects share one backend, so names need more than a timestamp. */
function uniqueSuffix(): string {
	return randomBytes(4).toString('hex');
}

/** Role names allow lowercase letters and hyphens only. */
export function uniqueAlphaSuffix(): string {
	return [...randomBytes(6)]
		.map((byte) => String.fromCharCode(97 + (byte % 26)))
		.join('');
}

export function dashboardListParams(title: string): Record<string, string> {
	return { search: title, columnKey: 'updatedAt', order: 'descend', page: '1' };
}

function groupByOf(url: URL): string {
	return url.searchParams.get('groupBy') ?? '';
}

export interface Routing {
	goto(path: string): Promise<void>;
	reload(): Promise<void>;
	goBack(): Promise<void>;
	goForward(): Promise<void>;
	/** Go back one entry and wait for `pathname`. */
	goBackTo(pathname: string): Promise<void>;
	url(): URL;
	params(): Record<string, string>;
	waitForPath(pathname: string): Promise<void>;
	waitForParam(key: string, value: string): Promise<void>;
	/** `history.length`: Chromium keeps it on POP and REPLACE, grows it on PUSH. */
	historyDepth(): Promise<number>;
	/** Complete the login form on the page as it stands, without navigating. */
	login(): Promise<void>;
	/** Sidebar entries are `div.nav-item`, not links. */
	sidebarItem(label: string): Locator;
	/** antd puts a `RouteTab` item's route on `data-node-key`. */
	routeTab(route: string): Locator;
	activeRouteTab(route: string): Locator;
	/** The picker `TopNav` renders. Several pages mount their own. */
	globalTimePicker(): Locator;
	selectRelativeTime(value: string): Promise<void>;
	expectRelativeTime(value: string): Promise<void>;
	/** Ctrl/Cmd-click `target`, run `body` on the tab it opens, then close it. */
	inNewTab(
		target: Locator,
		body: (tab: Routing) => Promise<void>,
	): Promise<void>;
	/** Hold every script requested during `body`, so lazy route chunks suspend. */
	whileScriptsHeld(body: () => Promise<void>): Promise<void>;
	gotoLogsExplorer(): Promise<void>;
	dashboards: {
		gotoList(title?: string): Promise<void>;
		/** Not `dashboard-title-0`: the search tokenises on hyphens and matches leftovers. */
		row(title: string): Locator;
		landmark(): Locator;
		title(): Locator;
	};
	k8s: {
		/** Open the pods list once its mount-time `compositeQuery` rewrite landed. */
		goto(params: Record<string, string>): Promise<void>;
		/** One nuqs push: `groupBy`, `page` and `orderBy` flush together. */
		groupBy(attribute: string): Promise<void>;
		waitUntilGrouped(attribute: string, grouped?: boolean): Promise<void>;
		groupBySelect(): Locator;
	};
	trace: {
		path(trace: LargeTrace): string;
		goto(trace: LargeTrace): Promise<void>;
		rootRow(trace: LargeTrace): Locator;
		back(): Promise<void>;
	};
	roles: {
		/** Fill the create form far enough to arm the navigation blocker. */
		openCreateForm(name: string): Promise<void>;
		nameInput(): Locator;
		cancel(): Promise<void>;
		save(): Promise<void>;
		discardDialog(): Locator;
		settings(): Locator;
		removeByName(names: string[]): Promise<void>;
	};
}

export function routingDriver(page: Page): Routing {
	const timePicker = (): Locator => page.getByTestId('dropDown');

	const routing: Routing = {
		goto: async (path) => {
			await page.goto(path);
		},
		reload: async () => {
			await page.reload();
		},
		goBack: async () => {
			await page.goBack();
		},
		goForward: async () => {
			await page.goForward();
		},
		goBackTo: async (pathname) => {
			await page.goBack();
			await routing.waitForPath(pathname);
		},

		url: () => new URL(page.url()),
		params: () => Object.fromEntries(routing.url().searchParams),
		waitForPath: (pathname) =>
			page.waitForURL((url) => url.pathname === pathname),
		waitForParam: (key, value) =>
			page.waitForURL((url) => url.searchParams.get(key) === value),
		historyDepth: () =>
			page.evaluate(
				() =>
					(globalThis as unknown as { history: { length: number } }).history.length,
			),

		login: async () => {
			await page.getByTestId('email').fill(ADMIN.email);
			await page.getByTestId('initiate_login').click();
			await page.getByTestId('password').fill(ADMIN.password);
			await page.getByTestId('password_authn_submit').click();
		},

		sidebarItem: (label) =>
			page.locator('.nav-item').filter({ hasText: new RegExp(`^${label}$`) }),
		routeTab: (route) => page.locator(`.ant-tabs-tab[data-node-key="${route}"]`),
		activeRouteTab: (route) =>
			routing.routeTab(route).getByRole('tab', { selected: true }),

		globalTimePicker: () =>
			page.locator('.top-nav-container').getByTestId('dropDown'),

		// A click before the picker is interactive is dropped silently, so retry the
		// open. The popover unmounts on close, which is what proves the selection
		// committed: the url may legitimately stay the same.
		selectRelativeTime: async (value) => {
			const option = page.getByTestId(`time-option-${value}`);
			await expect(async () => {
				if (!(await option.isVisible())) {
					await timePicker().click();
				}
				await expect(option).toBeVisible({ timeout: 3_000 });
			}).toPass({ timeout: 30_000 });
			await option.click();
			await expect(option).toBeHidden();
		},

		expectRelativeTime: async (value) => {
			await expect(timePicker()).toHaveAccessibleName(RELATIVE_TIME_LABELS[value]);
		},

		inNewTab: async (target, body) => {
			const [tab] = await Promise.all([
				page.context().waitForEvent('page'),
				target.click({ modifiers: ['ControlOrMeta'] }),
			]);
			try {
				await tab.waitForLoadState();
				await body(routingDriver(tab));
			} finally {
				await tab.close();
			}
		},

		// The handler stays installed after the release: `unroute` drops the
		// requests still parked in it.
		whileScriptsHeld: async (body) => {
			let release = (): void => {};
			const held = new Promise<void>((resolve) => {
				release = resolve;
			});
			await page.route('**/*.js', async (route) => {
				await held;
				await route.continue();
			});
			try {
				await body();
			} finally {
				release();
			}
		},

		gotoLogsExplorer: () => gotoLogsExplorer(page),

		dashboards: {
			gotoList: async (title) => {
				if (!title) {
					await page.goto(PATH.dashboards);
					await expect(routing.dashboards.landmark()).toBeVisible();
					return;
				}
				const search = new URLSearchParams(dashboardListParams(title));
				await page.goto(`${PATH.dashboards}?${search.toString()}`);
				await expect(routing.dashboards.row(title)).toBeVisible();
			},
			row: (title) =>
				page
					.locator('[data-testid^="dashboard-title-"]')
					.filter({ hasText: title }),
			// The views rail renders whether or not the list is empty.
			landmark: () => page.getByTestId('dashboards-view-search'),
			title: () => page.getByTestId('dashboard-title'),
		},

		k8s: {
			goto: async (params) => {
				const search = new URLSearchParams({ category: 'pods', ...params });
				await page.goto(`${PATH.k8s}?${search.toString()}`);
				await page.waitForURL((url) => url.searchParams.has('compositeQuery'));
				await expect(routing.k8s.groupBySelect()).toBeVisible();
			},
			// The search input stays readonly until the dropdown opens, and `hasText`
			// would also match longer keys, so type after opening and match the title.
			groupBy: async (attribute) => {
				await routing.k8s.groupBySelect().click();
				await page.keyboard.type(attribute);
				await page.locator(`.ant-select-item-option[title="${attribute}"]`).click();
				await page.keyboard.press('Escape');
				await routing.k8s.waitUntilGrouped(attribute);
			},
			waitUntilGrouped: (attribute, grouped = true) =>
				page.waitForURL((url) => groupByOf(url).includes(attribute) === grouped),
			groupBySelect: () => page.getByTestId('k8s-table-group-by-select'),
		},

		trace: {
			path: (trace) => `/trace/${trace.traceId}`,
			goto: (trace) =>
				gotoTraceUntilLoaded(
					page,
					routing.trace.path(trace),
					`cell-0-${trace.landmarks.root}`,
				),
			rootRow: (trace) => page.getByTestId(`cell-0-${trace.landmarks.root}`),
			back: async () => {
				await page.getByRole('button', { name: 'Back' }).click();
			},
		},

		roles: {
			openCreateForm: async (name) => {
				await page.goto(PATH.roleCreate);
				await routing.roles.nameInput().fill(name);
				await expect(page.getByText('Unsaved changes')).toBeVisible();
			},
			nameInput: () => page.getByTestId('role-name-input'),
			cancel: async () => {
				await page.getByTestId('cancel-button').click();
			},
			save: async () => {
				await page.getByTestId('save-button').click();
			},
			discardDialog: () => page.getByTestId('discard-changes-dialog'),
			settings: () => page.getByTestId('roles-settings'),
			removeByName: async (names) => {
				const headers = { Authorization: `Bearer ${await authToken(page)}` };
				const res = await page.request.get('/api/v1/roles', { headers });
				const { data } = (await res.json()) as {
					data: { id: string; name: string }[];
				};
				await Promise.all(
					data
						.filter((role) => names.includes(role.name))
						.map((role) =>
							page.request.delete(`/api/v1/roles/${role.id}`, { headers }),
						),
				);
			},
		},
	};

	return routing;
}

// The seeder serves inserts on one ClickHouse session, so parallel workers
// collide with a transient `500 concurrent queries within the same session`.
const SEED_RETRY_MS = 120_000;
const SEED_TIMEOUT_MS = 180_000;

async function seedWithRetry(seed: () => Promise<void>): Promise<void> {
	await expect(seed).toPass({
		timeout: SEED_RETRY_MS,
		intervals: [1_000, 2_000, 5_000],
	});
}

const withRouting = driver('routing', ({ page }) => routingDriver(page));

const withDashboard = seeded(
	'dashboard',
	async ({ page }) => {
		const title = `routing-${uniqueSuffix()}`;
		const id = await createDashboardViaApi(page, title);
		return { id, title, path: `${PATH.dashboards}/${id}` };
	},
	async ({ page, value }) =>
		deleteDashboardViaApi(page.request, value.id, await authToken(page)),
);

const withTrace = seeded(
	'largeTrace',
	async ({ page }) => {
		const trace = loadLargeTrace();
		await seedWithRetry(() => seedTracesViaSeeder(page.request, trace.spans));
		return trace;
	},
	undefined,
	{ timeout: SEED_TIMEOUT_MS },
);

// Group-by options come from `/fields/keys` over the queried window, so the
// select stays empty until pod metrics exist inside it.
const withPods = seeded(
	'pods',
	async ({ page }) => {
		await seedWithRetry(() => seedPodMetricsViaSeeder(page));
		return { groupBy: NAMESPACE_ATTR };
	},
	undefined,
	{ timeout: SEED_TIMEOUT_MS },
);

export const test = withPods(
	withTrace(withDashboard(withRouting(kit))),
).extend<{
	/** The routing driver on an unauthenticated page. */
	guest: Routing;
}>({
	guest: async ({ browser }, use) => {
		const ctx = await browser.newContext();
		await use(routingDriver(await ctx.newPage()));
		await ctx.close();
	},
});

export { expect, onAdminPage } from './kit';
