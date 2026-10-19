import { expect, type Locator, type Page } from '@playwright/test';

import { quickFiltersDriver } from './explorers';
import {
	allowFor,
	driver,
	kit,
	seeded,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	type Layer,
	type WorkerLayer,
} from './kit';
import { querySearchDriver, type QuerySearch } from './querysearch';
import { savedViewsDriver, type SavedViews } from './savedviews';
import { childSpan, rootSpan, SPAN_KIND, stamp, STATUS } from './spans';
import { seedTracesViaSeeder, type SeederSpan } from './traces';

/**
 * The traces explorer: its four views, the traces quick-filter rail and the
 * saved views built on `savedViewsDriver(page, 'traces')`.
 */

export const TRACES_EXPLORER_PATH = '/traces-explorer';
const RELATIVE_TIME = '15m';
const RUN_TEST_ID = 'explorer-run-query-btn';
const ROW_PREFIX = 'traces-table-row-';

/**
 * A saved view auto-restores from `LAST_USED_SAVED_VIEWS`, and the column and
 * toolbar keys leak one test's layout into the next.
 */
const STORAGE_KEYS = [
	'LAST_USED_SAVED_VIEWS',
	'TRACES_LIST_OPTIONS',
	'TRACES_LIST_COLUMNS',
	'TRACES_VIEW_COLUMNS',
	'SHOW_EXPLORER_TOOLBAR',
];

/**
 * `parser/analyzeQuery.ts` keeps ANTLR's console listener, so an expression typed
 * one key at a time logs a syntax error for every incomplete prefix.
 */
const PARSER_NOISE = /^line \d+:\d+ /;
export const withoutParserNoise = (errors: string[]): string[] =>
	errors.filter((line) => !PARSER_NOISE.test(line));

export type ExplorerView = 'list' | 'trace' | 'timeseries' | 'table';

/** The `panelTypes` value each view writes. */
const PANEL_TYPE: Record<ExplorerView, string> = {
	list: 'list',
	trace: 'trace',
	timeseries: 'graph',
	table: 'table',
};

export interface TracesExplorer {
	goto(params?: Record<string, string>): Promise<void>;
	reload(): Promise<void>;
	/** A URL search param, or null. */
	urlParam(name: string): string | null;
	search: QuerySearch;
	filterService(name: string): Promise<void>;
	switchView(view: ExplorerView): Promise<void>;
	viewButton(view: ExplorerView): Locator;
	/** `panelTypes` from the URL, JSON-decoded, or null. */
	panelType(): string | null;
	/** The TanStack table of the list (`list`) or trace (`trace`) view. */
	table(view?: 'list' | 'trace'): Locator;
	row(key: string): Locator;
	rows(): Locator;
	/** Re-run the query until `key`'s row renders: the list fetches once. */
	waitForRow(key: string): Promise<void>;
	cell(rowKey: string, field: string): Locator;
	/** Click a list row and wait for its trace-details URL. */
	openRow(rowKey: string, traceId: string): Promise<void>;
	/** A waterfall row on the trace-details page. */
	traceDetailsRow(spanId: string): Locator;
	timeSeriesGraph(): Locator;
	timeSeriesCanvas(): Locator;
	tableView(): Locator;
	tableCell(text: string): Locator;
	/** The `service.name` cell of every list row. */
	rowServices(): Locator;
	toast(text: string): Locator;
	/** Click "Only" for `value` in the rail section for attribute `key`. */
	pickOnly(key: string, value: string): Promise<void>;
	quickFilterValue(key: string, value: string): Locator;
	views: SavedViews;
}

const storageReset = new WeakSet<Page>();

export function tracesExplorerDriver(page: Page): TracesExplorer {
	const search = querySearchDriver(page, { runTestId: RUN_TEST_ID });
	const quickFilters = quickFiltersDriver(page);

	const resetStorage = async (): Promise<void> => {
		if (storageReset.has(page)) {
			return;
		}
		// Once per page, so a reload keeps what the scenario wrote.
		await page.addInitScript(
			({ keys, marker }) => {
				if (sessionStorage.getItem(marker)) {
					return;
				}
				sessionStorage.setItem(marker, '1');
				keys.forEach((key) => localStorage.removeItem(key));
			},
			{ keys: STORAGE_KEYS, marker: '__e2e_traces_explorer_reset' },
		);
		storageReset.add(page);
	};

	/**
	 * The content pane's scrollbar initialises on idle and re-parents the query
	 * editor, which drops a caret mid-typing to position 0.
	 */
	const settled = async (): Promise<void> => {
		await expect(search.runButton()).toBeVisible();
		await expect(
			page
				.getByTestId('quick-filters-layout-content')
				.locator('[data-overlayscrollbars-viewport]'),
		).toBeAttached();
	};

	const filterSection = (key: string): Locator =>
		page.locator(`[data-filter-key="${key}"]`);

	const explorer: TracesExplorer = {
		search,
		views: savedViewsDriver(page, 'traces'),

		goto: async (params = {}) => {
			await quickFilters.dismissAnnouncement();
			await resetStorage();
			const query = new URLSearchParams({
				relativeTime: RELATIVE_TIME,
				...params,
			});
			await page.goto(`${TRACES_EXPLORER_PATH}?${query.toString()}`);
			await settled();
		},

		reload: async () => {
			await page.reload();
			await settled();
		},

		urlParam: (name) => new URL(page.url()).searchParams.get(name),

		filterService: (name) => search.apply(`service.name = '${name}'`),

		viewButton: (view) => page.getByTestId(`explorer-view-${view}`),

		panelType: () => {
			const raw = new URL(page.url()).searchParams.get('panelTypes');
			if (!raw) {
				return null;
			}
			try {
				return JSON.parse(raw) as string;
			} catch {
				return raw;
			}
		},

		switchView: async (view) => {
			await explorer.viewButton(view).click();
			await expect(explorer.viewButton(view)).toHaveAttribute(
				'aria-pressed',
				'true',
			);
			await expect(async () => {
				expect(explorer.panelType()).toBe(PANEL_TYPE[view]);
			}).toPass();
		},

		table: (view = 'list') => page.getByTestId(`traces-table-${view}`),
		rows: () => page.locator(`[data-testid^="${ROW_PREFIX}"]`),
		row: (key) => page.getByTestId(`${ROW_PREFIX}${key}`),

		waitForRow: async (key) => {
			allowFor(SEEDED_TEST_BUDGET);
			const row = explorer.row(key);
			await expect(async () => {
				if (!(await row.isVisible())) {
					await search.run();
				}
				await expect(row).toBeVisible({ timeout: 5_000 });
			}).toPass({ timeout: SEEDED_DATA_TIMEOUT });
		},

		cell: (rowKey, field) => explorer.row(rowKey).getByTestId(field).first(),

		openRow: async (rowKey, traceId) => {
			await explorer.cell(rowKey, 'name').click();
			await expect(page).toHaveURL(
				new RegExp(`/trace/${traceId}\\?.*spanId=${rowKey}`),
			);
		},

		traceDetailsRow: (spanId) => page.getByTestId(`cell-0-${spanId}`),

		timeSeriesGraph: () => page.getByTestId('time-series-graph'),
		timeSeriesCanvas: () =>
			page.getByTestId('time-series-graph').locator('canvas').first(),

		tableView: () => page.getByTestId('query-table'),
		tableCell: (text) =>
			page
				.getByTestId('query-table')
				.locator('tbody td')
				.getByText(text, { exact: true }),
		rowServices: () =>
			page.locator(`[data-testid^="${ROW_PREFIX}"]`).getByTestId('service.name'),

		toast: (text) => page.getByText(text, { exact: true }),

		quickFilterValue: (key, value) =>
			filterSection(key).getByTestId(`checkbox-value-row-${value}`),

		pickOnly: async (key, value) => {
			const section = filterSection(key);
			const header = section.getByTestId('checkbox-filter-header');
			await expect(header).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
			if ((await header.getAttribute('data-state')) !== 'open') {
				await header.click();
			}
			await expect(header).toHaveAttribute('data-state', 'open');
			// The rail shows ten values; the seeded one has to be searched for.
			await section.getByTestId('checkbox-filter-search-toggle').click();
			await section.getByTestId('checkbox-filter-search').fill(value);
			const row = explorer.quickFilterValue(key, value);
			await expect(row).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
			await row.getByText(value, { exact: true }).click();
			await search.expectContains(value);
		},
	};

	return explorer;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface TracesExplorerSeed {
	stamp: string;
	service: string;
	traceId: string;
	rootSpanId: string;
	dbSpanId: string;
	errorSpanId: string;
	/** Root span ids of the five single-span traces. */
	extraRootIds: string[];
	spanCount: number;
	traceSpanCount: number;
}

const EXTRA_ROOT_AGO_MS = [540_000, 420_000, 300_000, 180_000, 90_000];

export const withTracesExplorerSeed: WorkerLayer<{
	tracesExplorerSeed: TracesExplorerSeed;
}> = seeded(
	'tracesExplorerSeed',
	async ({ page, workerIndex }) => {
		const prefix = stamp('tx', workerIndex);
		const service = `${prefix}-orders`;

		const root = rootSpan({
			service,
			name: 'GET /orders',
			durationMs: 300,
			agoMs: 60_000,
			attrs: { 'http.method': 'GET', 'http.status_code': 200 },
		});
		const db = childSpan(root, {
			service,
			name: 'SELECT orders',
			kind: SPAN_KIND.client,
			durationMs: 40,
			offsetMs: 20,
			attrs: { 'db.system': 'postgresql', 'db.name': 'orders' },
		});
		const pay = childSpan(root, {
			service,
			name: 'POST /pay',
			kind: SPAN_KIND.client,
			status: STATUS.error,
			durationMs: 120,
			offsetMs: 80,
			attrs: { 'http.method': 'POST', 'http.status_code': 500 },
		});
		const extras = EXTRA_ROOT_AGO_MS.map((agoMs) =>
			rootSpan({
				service,
				name: 'GET /orders',
				durationMs: 150,
				agoMs,
				attrs: { 'http.method': 'GET', 'http.status_code': 200 },
			}),
		);
		const spans: SeederSpan[] = [root, db, pay, ...extras];
		await seedTracesViaSeeder(page.request, spans);

		return {
			stamp: prefix,
			service,
			traceId: root.trace_id,
			rootSpanId: root.span_id,
			dbSpanId: db.span_id,
			errorSpanId: pay.span_id,
			extraRootIds: extras.map((span) => span.span_id),
			spanCount: spans.length,
			traceSpanCount: 3,
		};
	},
	// Views are org-wide; every name a spec saves starts with the stamp.
	async ({ page, value }) => {
		await savedViewsDriver(page, 'traces').removeByPrefix(value.stamp);
	},
);

export const withTracesExplorer: Layer<{ traces: TracesExplorer }> = driver(
	'traces',
	({ page }) => tracesExplorerDriver(page),
);

/** The traces explorer `test`. */
export const test = withTracesExplorer(withTracesExplorerSeed(kit));
export { expect } from './kit';
