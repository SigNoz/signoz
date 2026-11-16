import { expect, type Locator, type Page } from '@playwright/test';

import {
	allowFor,
	driver,
	kit,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	seeded,
	type Layer,
	type WorkerLayer,
} from './kit';
import { wheelTo } from './scroll';
import { childSpan, rootSpan, SPAN_KIND, stamp, STATUS } from './spans';
import { seedTracesViaSeeder, type SeederSpan } from './traces';

/**
 * APM: the services list, a service's detail tabs, its top-level operations
 * page and the service map.
 *
 * The services list reads `/api/v2/services`, scoped to root spans. Each detail
 * tab is a read-only system dashboard: the Overview reads spans entering the
 * service, the DB Call and External tabs read span metrics that nothing seeds,
 * so specs assert those render, not their values.
 */

export const SERVICE_TAB = {
	Overview: 'OVER_METRICS',
	'DB Call Metrics': 'DB_CALL_METRICS',
	'External Metrics': 'EXTERNAL_METRICS',
} as const;

export type ServiceTab = keyof typeof SERVICE_TAB;

/** Panel titles, from the `services-*` system dashboard definitions. */
export const OVERVIEW_PANELS = [
	'Latency',
	'Rate (ops/s)',
	'Apdex',
	'Error Percentage',
] as const;

export const DB_PANELS = [
	'Database Calls RPS',
	'Database Calls Avg Duration',
] as const;

export const EXTERNAL_PANELS = [
	'External Call Error Percentage',
	'External Call duration',
	'External Call RPS(by Address)',
	'External Call duration(by Address)',
] as const;

const KEY_OPERATIONS_PANEL = 'Key Operations';

const RELATIVE_TIME = '15m';

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface ApmSeed {
	stamp: string;
	/** Six root spans, one of them an error. */
	service: string;
	/** Called once by `service`, in the same insert, so the MVs can join them. */
	downstream: string;
	entryOp: 'POST /checkout';
	ops: {
		checkout: { name: 'POST /checkout'; calls: 4; errors: 1 };
		cart: { name: 'GET /cart'; calls: 2; errors: 0 };
	};
	/** `numErrors * 100 / numCalls` over the root spans, as the list renders it. */
	errorRate: string;
}

export function buildApmSpans(prefix: string): {
	seed: ApmSeed;
	spans: SeederSpan[];
} {
	const service = `${prefix}-checkout`;
	const downstream = `${prefix}-payment`;
	const checkouts = [50_000, 40_000, 30_000, 20_000].map((agoMs, index) =>
		rootSpan({
			service,
			name: 'POST /checkout',
			status: index === 0 ? STATUS.error : STATUS.ok,
			durationMs: 120,
			agoMs,
		}),
	);
	const carts = [45_000, 15_000].map((agoMs) =>
		rootSpan({ service, name: 'GET /cart', durationMs: 80, agoMs }),
	);
	const charge = childSpan(checkouts[1], {
		service: downstream,
		name: 'charge',
		kind: SPAN_KIND.server,
		durationMs: 40,
		offsetMs: 20,
	});

	return {
		spans: [...checkouts, ...carts, charge],
		seed: {
			stamp: prefix,
			service,
			downstream,
			entryOp: 'POST /checkout',
			ops: {
				checkout: { name: 'POST /checkout', calls: 4, errors: 1 },
				cart: { name: 'GET /cart', calls: 2, errors: 0 },
			},
			errorRate: ((1 * 100) / 6).toFixed(2),
		},
	};
}

export const withApmSeed: WorkerLayer<{ apmSeed: ApmSeed }> = seeded(
	'apmSeed',
	async ({ page, workerIndex }) => {
		const { seed, spans } = buildApmSpans(stamp('apm', workerIndex));
		await seedTracesViaSeeder(page.request, spans);
		return seed;
	},
);

// ─── Driver ──────────────────────────────────────────────────────────────────

export interface ServiceMapEdge {
	parent: string;
	child: string;
	callCount: number;
}

/** The Overview's Key Operations table panel. */
export interface KeyOperations {
	root(): Locator;
	/** Wheel the panel into view: it renders its table only once visible. */
	reveal(): Promise<void>;
	rows(): Locator;
	row(opName: string): Locator;
	cell(opName: string, header: string): Promise<string>;
}

export interface Apm {
	gotoServices(): Promise<void>;
	servicesTable(): Locator;
	serviceRow(name: string): Locator;
	/** Narrow the list with the Application column's search box. */
	searchService(name: string): Promise<void>;
	/** Reload and search until the row renders: the list fetches once. */
	waitForService(name: string): Promise<void>;
	headers(): Promise<string[]>;
	/** A row's cell texts keyed by header text. */
	rowCells(name: string): Promise<Record<string, string>>;
	openService(name: string): Promise<void>;
	gotoService(name: string, tab?: ServiceTab): Promise<void>;
	tab(name: ServiceTab): Locator;
	openTab(name: ServiceTab): Promise<void>;
	/** A system dashboard panel, by its title. */
	panel(title: string): Locator;
	/** Visible, and not showing the panel's error state. */
	expectPanelRendered(title: string): Promise<void>;
	keyOps: KeyOperations;
	/**
	 * Drill into an operation's traces from its Calls cell; resolves once the
	 * traces explorer has loaded, in this tab or the one it opened.
	 */
	openKeyOp(opName: string): Promise<void>;
	/** Traces explorer list rows, after `openKeyOp`. */
	explorerRows(): Locator;
	/** The span-name cell of every explorer row. */
	explorerRowNames(): Locator;
	gotoTopLevelOps(name: string): Promise<void>;
	topLevelOpsTable(): Locator;
	servicesBreadcrumb(): Locator;
	/** Open the map and resolve with the dependency graph the page received. */
	gotoServiceMap(): Promise<ServiceMapEdge[]>;
	/** Reopen the map until its dependency graph has the `parent -> child` edge. */
	waitForServiceMapEdge(parent: string, child: string): Promise<void>;
	serviceMap: { root(): Locator; canvas(): Locator; empty(): Locator };
}

async function cellsByHeader(
	scope: Locator,
	row: Locator,
): Promise<Record<string, string>> {
	const headers = (await scope.locator('thead th').allInnerTexts()).map((text) =>
		text.trim(),
	);
	const cells = (await row.locator('td').allInnerTexts()).map((text) =>
		text.trim(),
	);
	return Object.fromEntries(
		headers.map((header, i) => [header, cells[i] ?? '']),
	);
}

export function apmDriver(page: Page): Apm {
	const servicesTable = (): Locator => page.getByTestId('services-table');
	const serviceRow = (name: string): Locator =>
		servicesTable().locator(`tbody tr[data-row-key="${name}"]`);
	const panelByTitle = (title: string): Locator =>
		page.locator('[data-panel-root]').filter({
			has: page.getByTestId('panel-title').getByText(title, { exact: true }),
		});
	const keyOpsRoot = (): Locator => panelByTitle(KEY_OPERATIONS_PANEL);
	const keyOpRows = (): Locator =>
		keyOpsRoot().locator('tbody tr.ant-table-row');
	const keyOpRow = (opName: string): Locator =>
		keyOpRows().filter({
			has: page.getByRole('cell', { name: opName, exact: true }),
		});
	let explorerPage = page;

	const keyOps: KeyOperations = {
		root: keyOpsRoot,
		reveal: async () => {
			await wheelTo(keyOpsRoot());
			await expect(keyOpsRoot()).toHaveAttribute('data-panel-visible', 'true');
		},
		rows: keyOpRows,
		row: keyOpRow,
		cell: async (opName, header) => {
			await expect(keyOpRow(opName)).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			const cells = await cellsByHeader(keyOpsRoot(), keyOpRow(opName));
			if (!(header in cells)) {
				throw new Error(
					`Key Operations has no "${header}" column: ${Object.keys(cells).join(', ')}`,
				);
			}
			return cells[header];
		},
	};

	const apm: Apm = {
		servicesTable,
		serviceRow,
		keyOps,

		gotoServices: async () => {
			await page.goto(`/services?relativeTime=${RELATIVE_TIME}`);
			await expect(servicesTable()).toBeVisible();
		},

		searchService: async (name) => {
			const header = servicesTable().locator('thead th').first();
			await header.locator('.ant-table-filter-trigger').click();
			const input = page.getByPlaceholder('Search by service');
			await input.fill(name);
			await input.press('Enter');
			await expect(input).toBeHidden();
		},

		waitForService: async (name) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				await apm.gotoServices();
				await expect(servicesTable().locator('.ant-spin-spinning')).toHaveCount(0);
				await apm.searchService(name);
				await expect(serviceRow(name)).toBeVisible({ timeout: 5_000 });
			}).toPass({ timeout: SEEDED_TEST_BUDGET - 10_000 });
		},

		headers: async () =>
			(await servicesTable().locator('thead th').allInnerTexts())
				.map((text) => text.trim())
				.filter(Boolean),

		rowCells: (name) => cellsByHeader(servicesTable(), serviceRow(name)),

		openService: async (name) => {
			await page.getByTestId(`service-link-${name}`).click();
			await expect(page).toHaveURL(
				new RegExp(`/services/${encodeURIComponent(name)}(\\?|$)`),
			);
		},

		gotoService: async (name, tab) => {
			const params = new URLSearchParams({ relativeTime: RELATIVE_TIME });
			if (tab) {
				params.set('tab', SERVICE_TAB[tab]);
			}
			await page.goto(`/services/${encodeURIComponent(name)}?${params}`);
			await expect(apm.tab(tab ?? 'Overview')).toHaveAttribute(
				'aria-selected',
				'true',
			);
		},

		tab: (name) => page.getByRole('tab', { name, exact: true }),

		openTab: async (name) => {
			await apm.tab(name).click();
			await expect(page).toHaveURL(new RegExp(`tab=${SERVICE_TAB[name]}`));
			await expect(apm.tab(name)).toHaveAttribute('aria-selected', 'true');
		},

		panel: panelByTitle,

		expectPanelRendered: async (title) => {
			const panel = apm.panel(title);
			await expect(panel).toBeVisible();
			await expect(panel.getByTestId('panel-error')).toHaveCount(0);
		},

		openKeyOp: async (opName) => {
			const cells = await cellsByHeader(keyOpsRoot(), keyOpRow(opName));
			const callsColumn = Object.keys(cells).indexOf('Calls');
			await keyOpRow(opName).locator('td').nth(callsColumn).click();
			const popup = page
				.context()
				.waitForEvent('page', { timeout: 5_000 })
				.catch(() => undefined);
			await page.getByTestId('drilldown-view-traces').click();
			explorerPage =
				(await Promise.race([
					popup,
					page.waitForURL(/\/traces-explorer/).then(() => page),
				])) ?? page;
			await expect(explorerPage).toHaveURL(/\/traces-explorer/);
		},

		explorerRows: () =>
			explorerPage.locator('[data-testid^="traces-table-row-"]'),
		explorerRowNames: () => apm.explorerRows().getByTestId('name'),

		gotoTopLevelOps: async (name) => {
			await page.goto(
				`/services/${encodeURIComponent(name)}/top-level-operations?relativeTime=${RELATIVE_TIME}`,
			);
		},

		topLevelOpsTable: () => page.getByTestId('top-level-operations-table'),

		servicesBreadcrumb: () =>
			page.locator('.top-level-operations-header').getByRole('link', {
				name: 'services',
			}),

		gotoServiceMap: async () => {
			const response = page.waitForResponse(
				(res) =>
					res.url().includes('/api/v1/dependency_graph') &&
					res.request().method() === 'POST',
			);
			await page.goto(`/service-map?relativeTime=${RELATIVE_TIME}`);
			const res = await response;
			expect(res.ok()).toBe(true);
			const body = (await res.json()) as
				| ServiceMapEdge[]
				| { data?: ServiceMapEdge[] | null }
				| null;
			if (Array.isArray(body)) {
				return body;
			}
			return body?.data ?? [];
		},

		waitForServiceMapEdge: async (parent, child) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				const edges = await apm.gotoServiceMap();
				expect(edges).toContainEqual(expect.objectContaining({ parent, child }));
			}).toPass({ timeout: SEEDED_TEST_BUDGET - 10_000 });
		},

		serviceMap: {
			root: () => page.getByTestId('service-map'),
			canvas: () => page.getByTestId('service-map').locator('canvas'),
			empty: () => page.getByTestId('service-map-empty'),
		},
	};

	return apm;
}

export const withApm: Layer<{ apm: Apm }> = driver('apm', ({ page }) =>
	apmDriver(page),
);

/** The APM `test`: services, service detail, top-level operations, service map. */
export const test = withApmSeed(withApm(kit));
export { expect, SEEDED_DATA_TIMEOUT } from './kit';
