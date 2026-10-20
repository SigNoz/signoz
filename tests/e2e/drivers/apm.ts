import { expect, type Locator, type Page } from '@playwright/test';

import {
	allowFor,
	driver,
	kit,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	seeded,
	type ConsoleWatch,
	type Layer,
	type WorkerLayer,
} from './kit';
import { childSpan, rootSpan, SPAN_KIND, stamp, STATUS } from './spans';
import { seedTracesViaSeeder, type SeederSpan } from './traces';

/**
 * APM: the services list, a service's detail tabs, its top-level operations
 * page and the service map.
 *
 * `use_span_metrics` is off by default, so every page here reads spans: the
 * services list and Key Operations come from `/api/v2/services` and
 * `/api/v2/service/{top,entry_point}_operations`, scoped to root spans. The
 * Rate, Error % and Apdex panels query span metrics that nothing seeds, so
 * specs assert they render, not their values.
 */

export const SERVICE_TAB = {
	Overview: 'OVER_METRICS',
	'DB Call Metrics': 'DB_CALL_METRICS',
	'External Metrics': 'EXTERNAL_METRICS',
} as const;

export type ServiceTab = keyof typeof SERVICE_TAB;

/**
 * Known application defect: `/metric/metric_metadata` answers 500, not 404, for
 * a metric the stack never ingested. The Overview's Apdex panel asks for
 * `signoz_latency.bucket`, which the seeder does not emit.
 */
export const MISSING_METADATA = '/metric/metric_metadata';

/**
 * `noise` without the {@link MISSING_METADATA} 500: the failed response, its
 * failed load, and the axios error the DB Call and External tabs log for it,
 * which names no URL. The response always arrives before axios rejects.
 */
export function withoutMissingMetadata(noise: ConsoleWatch): ConsoleWatch {
	const known = (entry: string): boolean => entry.includes(MISSING_METADATA);
	const failedResponses = noise.failedResponses.filter((entry) => !known(entry));
	const seen = failedResponses.length < noise.failedResponses.length;
	return {
		failedResponses,
		errors: noise.errors.filter(
			(entry) =>
				!known(entry) &&
				!(seen && entry.includes('Request failed with status code 500')),
		),
	};
}

export const OVERVIEW_PANELS = [
	'service_latency',
	'operations_per_sec',
	'error_percentage_%',
	'apdex',
] as const;

export const DB_PANELS = [
	'database_call_rps',
	'database_call_avg_duration',
] as const;

export const EXTERNAL_PANELS = [
	'external_call_error_percentage',
	'external_call_duration',
	'external_call_rps_by_address',
	'external_call_duration_by_address',
] as const;

const RELATIVE_TIME = '15m';
const PANEL_ERROR_TEXT = 'Something went wrong';

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

export interface KeyOperations {
	root(): Locator;
	/** "Key Operations" or "Key Entrypoint Operations". */
	title(): Locator;
	rows(): Locator;
	row(opName: string): Locator;
	cell(opName: string, header: string): Promise<string>;
	/** Flip the Entrypoint Spans switch and resolve with the response rows. */
	toggleEntrypoint(): Promise<unknown[]>;
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
	panel(testId: string): Locator;
	/** Visible, and not showing the panel's error text. */
	expectPanelRendered(testId: string): Promise<void>;
	keyOps: KeyOperations;
	/** Click an operation name; resolves once the traces explorer has loaded. */
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
	const keyOpsRoot = (): Locator => page.getByTestId('top-operations');
	const keyOpRow = (opName: string): Locator =>
		keyOpsRoot().locator(`tbody tr[data-row-key="${opName}"]`);

	const keyOps: KeyOperations = {
		root: keyOpsRoot,
		title: () => keyOpsRoot().locator('.ant-table-title'),
		rows: () => keyOpsRoot().locator('tbody tr[data-row-key]'),
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
		toggleEntrypoint: async () => {
			const response = page.waitForResponse(
				(res) =>
					res.url().includes('/service/entry_point_operations') &&
					res.request().method() === 'POST',
			);
			await page.getByTestId('top-operations-entrypoint-toggle').click();
			const res = await response;
			expect(res.ok()).toBe(true);
			const body = (await res.json()) as { data?: unknown[] | null };
			return body.data ?? [];
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

		panel: (testId) => page.getByTestId(testId),

		expectPanelRendered: async (testId) => {
			const panel = apm.panel(testId);
			await expect(panel).toBeVisible();
			await expect(panel).not.toContainText(PANEL_ERROR_TEXT);
		},

		openKeyOp: async (opName) => {
			await keyOpRow(opName).getByTestId('top-operation-link').click();
			await expect(page).toHaveURL(/\/traces-explorer/);
		},

		explorerRows: () => page.locator('[data-testid^="traces-table-row-"]'),
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
