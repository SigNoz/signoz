import fs from 'fs';
import { expect, type Locator, type Page } from '@playwright/test';

import { antdDriver } from '../antd';
import { allowFor, SEEDED_DATA_TIMEOUT, SEEDED_TEST_BUDGET } from '../kit';
import {
	expressionParams,
	querySearchDriver,
	type QuerySearch,
} from '../querysearch';
import { tanstackDriver, type Tanstack } from '../tanstack';
import { timePickerDriver, type TimePicker } from '../timepicker';

import { logDetailDriver, type LogDetail } from './detail';
import { liveTailDriver, type LiveTail } from './liveTail';
import { ROW_SELECTOR } from './rows';
import { seedOne } from './seed';

export const LOGS_EXPLORER_PATH = '/logs/logs-explorer';
export const LINKED_ROW_CLASS = 'logs-linked-row';

const RELATIVE_TIME = '6h';
const FORMAT_OPTIONS = 'periscope-btn-format-options';
const ROW_PREFIX = 'logs-table-row-';
const LOG_DETAIL_DRAWER = 'log-detail-drawer';
const LIST = 'logs-list-virtuoso';
const RUN_QUERY = 'explorer-run-query-btn';
const ANNOUNCEMENT_DISMISSED_KEY = 'QUICK_FILTERS_SETTINGS_ANNOUNCEMENT';
const RELOAD_BUDGET_MS = 60_000;

// `addInitScript` re-runs on every navigation, so the dismissal is registered at
// most once per page rather than stacking up across helper calls.
const announcementDismissed = new WeakSet<Page>();

/**
 * Hide the quick-filters announcement tooltip so it cannot swallow a click.
 *
 * Registered through `addInitScript` rather than `page.evaluate` so it runs
 * in the app's own origin on every navigation: an `evaluate` before `goto`
 * writes to the pre-navigation `about:blank` origin, which the app never
 * reads. Must run before the first navigation.
 */
export async function dismissQuickFiltersAnnouncement(
	page: Page,
): Promise<void> {
	if (announcementDismissed.has(page)) {
		return;
	}
	await page.addInitScript((key) => {
		localStorage.setItem(key, 'false');
	}, ANNOUNCEMENT_DISMISSED_KEY);
	announcementDismissed.add(page);
}

export type LogsFormat = 'Raw' | 'Default' | 'Column';
export type LogsView = 'List View' | 'Time Series' | 'Table';

const FORMAT_MODES: Record<LogsFormat, string> = {
	Raw: 'raw',
	Default: 'list',
	Column: 'table',
};

const VIEW_PANEL: Record<LogsView, string> = {
	'List View': 'list',
	'Time Series': 'graph',
	Table: 'table',
};

export interface GotoOptions {
	expression?: string;
	relativeTime?: string;
	pageSize?: number;
	view?: LogsView;
}

export interface LogsExplorer {
	goto(options?: GotoOptions): Promise<void>;
	/**
	 * `goto`, then reload until `firstBody` renders. The explorer fetches once
	 * and shows its empty state without refetching when ingestion lags.
	 */
	gotoUntil(firstBody: string, options?: GotoOptions): Promise<void>;
	setFormat(format: LogsFormat): Promise<void>;
	search: QuerySearch;
	table: Tanstack;
	timePicker: TimePicker;
	detail: LogDetail;
	live: LiveTail;

	/** Rows of the explorer list, in any format. */
	listRows(): Locator;
	rowByBody(text: string): Locator;
	/** `line-NN` / `old` / `json` tokens of the rendered rows, in DOM order. */
	visibleTokens(marker: string): Promise<string[]>;
	runButton(): Locator;

	switchView(view: LogsView): Promise<void>;
	timeSeriesGraph(): Locator;
	timeSeriesCanvas(): Locator;
	timeSeriesHeader(): Locator;
	frequencyChart(): Locator;
	/** Turn the frequency chart on. It is off until a viewer enables it. */
	showFrequencyChart(): Promise<void>;
	queryTable(): Locator;
	queryTableRows(): Locator;

	/** Pick a preset by URL value (`15m`). */
	setTimeRange(value: string): Promise<void>;
	/** Pick an order-by option by label, e.g. `timestamp (asc)`. */
	setOrderBy(label: string): Promise<void>;
	/**
	 * Scroll the Column table until `expected` distinct rows have rendered. Fails
	 * if one DOM snapshot ever holds the same row twice. Returns every key seen.
	 */
	collectRowKeys(expected: number): Promise<string[]>;
	openColumns(): Promise<void>;
	addColumn(key: string): Promise<void>;
	/** Export the list and read the file back. */
	download(format: 'csv' | 'jsonl'): Promise<{ name: string; text: string }>;
	/** Hover `row`, press its copy-link button, return the clipboard text. */
	copyRowLink(row: Locator): Promise<string>;
	/** Seed one row under `service`, `offsetMs` from now. */
	seedRow(service: string, body: string, offsetMs?: number): Promise<void>;
	toast(text: string): Locator;
	reload(): Promise<void>;
	/** Open `url` in a new tab of the same context. */
	openInNewTab(url: string): Promise<Page>;
	/** A row by log id, in any format. */
	rowById(logId: string, target?: Page): Locator;
	/** Top-level route tab (Explorer, Pipelines, Views). */
	openTab(name: string): Promise<void>;
	gotoIndexFields(): Promise<void>;

	rows(target?: Page): Locator;
	row(logId: string, target?: Page): Locator;
	highlightedRows(target?: Page): Locator;
	unhighlightedRows(target?: Page): Locator;
	activeLogId(target?: Page): string;
	detailsDrawer(target?: Page): Locator;
	clickRowFirstCell(row: Locator): Promise<void>;
	openDetailsFromRow(row: Locator): Promise<void>;
	openContextView(): Promise<void>;
	/** Click the first context log; resolves with the tab it opened. */
	openFirstContextLogInNewTab(): Promise<Page>;
}

function explorerUrl(options: GotoOptions): string {
	const params = new URLSearchParams({
		relativeTime: options.relativeTime ?? RELATIVE_TIME,
	});
	if (options.expression) {
		for (const [key, value] of Object.entries(
			expressionParams(options.expression, 'logs'),
		)) {
			// `expressionParams` is already URI-encoded; URLSearchParams encodes
			// again, which is the double encoding the app itself writes.
			params.set(key, value);
		}
	}
	if (options.pageSize) {
		params.set('pageSize', String(options.pageSize));
	}
	if (options.view) {
		params.set('panelTypes', JSON.stringify(VIEW_PANEL[options.view]));
	}
	return `${LOGS_EXPLORER_PATH}?${params.toString()}`;
}

export function logsExplorerDriver(page: Page): LogsExplorer {
	const contextItems = (): Locator =>
		page.locator('[data-testid^="context-log-item-"]');
	const listRows = (): Locator => page.getByTestId(LIST).locator(ROW_SELECTOR);
	const table = tanstackDriver(page, { rowTestIdPrefix: ROW_PREFIX });
	const timePicker = timePickerDriver(page);
	const formatOption = (format: LogsFormat): Locator =>
		page.getByTestId(`format-option-${FORMAT_MODES[format]}`);

	const readyLocator = (view?: LogsView): Locator => {
		if (view === 'Time Series') {
			return page.getByTestId('time-series-view-header');
		}
		if (view === 'Table') {
			return page.getByTestId('query-table');
		}
		return page.getByTestId(FORMAT_OPTIONS);
	};

	const logs: LogsExplorer = {
		search: querySearchDriver(page, { runTestId: RUN_QUERY }),
		table,
		timePicker,
		detail: logDetailDriver(page),
		live: liveTailDriver(page),

		goto: async (options = {}) => {
			await dismissQuickFiltersAnnouncement(page);
			await page.goto(explorerUrl(options));
			await expect(readyLocator(options.view)).toBeVisible();
		},

		gotoUntil: async (firstBody, options = {}) => {
			allowFor(SEEDED_TEST_BUDGET);
			await logs.goto(options);
			let attempt = 0;
			await expect(async () => {
				if (attempt > 0) {
					await page.reload();
				}
				attempt += 1;
				await expect(logs.rowByBody(firstBody).first()).toBeVisible({
					timeout: 10_000,
				});
			}).toPass({ timeout: RELOAD_BUDGET_MS, intervals: [1_000] });
		},

		setFormat: async (format) => {
			const trigger = page.getByTestId(FORMAT_OPTIONS);
			const option = formatOption(format);
			const applied = new RegExp(`%22format%22%3A%22${FORMAT_MODES[format]}%22`);

			await expect(async () => {
				if (!(await option.isVisible())) {
					await trigger.click();
					await expect(option).toBeVisible();
				}
				await option.click();
				await expect(page).toHaveURL(applied, { timeout: 3_000 });
			}).toPass({ timeout: 20_000 });

			await trigger.click();
			await expect(option).toBeHidden();
		},

		listRows,
		rowByBody: (text) => listRows().filter({ hasText: text }),

		visibleTokens: async (marker) => {
			const texts = await listRows().allInnerTexts();
			const token = new RegExp(`${marker} (line-\\d{2}|old)|${marker} json`);
			return texts.flatMap((text) => {
				const match = token.exec(text);
				if (!match) {
					return [];
				}
				return [match[1] ?? 'json'];
			});
		},

		runButton: () => page.getByTestId(RUN_QUERY),

		switchView: async (view) => {
			await page.getByRole('button', { name: view, exact: true }).click();
			await expect(page).toHaveURL(
				new RegExp(`panelTypes=(%22|")${VIEW_PANEL[view]}(%22|")`),
			);
		},

		timeSeriesGraph: () => page.getByTestId('time-series-graph'),
		timeSeriesCanvas: () =>
			page.getByTestId('time-series-graph').locator('canvas').first(),
		timeSeriesHeader: () => page.getByTestId('time-series-view-header'),
		frequencyChart: () => page.getByTestId('logs-frequency-chart'),
		showFrequencyChart: async () => {
			const toggle = page.getByTestId('logs-frequency-chart-toggle');
			if ((await toggle.getAttribute('aria-checked')) !== 'true') {
				await toggle.click();
			}
			await expect(toggle).toHaveAttribute('aria-checked', 'true');
		},
		queryTable: () => page.getByTestId('query-table'),
		queryTableRows: () =>
			page.getByTestId('query-table').locator('tbody tr.ant-table-row'),

		setTimeRange: async (value) => {
			await timePicker.pickPreset(value);
		},

		setOrderBy: async (label) => {
			const select = page.getByTestId('list-view-order-by');
			await select.click();
			await select
				.locator('input[role="combobox"]')
				.fill(label.split(' ')[0] ?? label);
			const dropdown = await antdDriver(page).ownDropdown(select);
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ has: page.getByText(label, { exact: true }) })
				.click();
			await expect(select).toContainText(label);
		},

		collectRowKeys: async (expected) => {
			allowFor(SEEDED_TEST_BUDGET);
			const seen = new Set<string>();
			await expect(async () => {
				const keys = (await table.rowKeys()).filter(
					(key) => key && key !== 'undefined',
				);
				expect(new Set(keys).size).toBe(keys.length);
				keys.forEach((key) => seen.add(key));
				if (seen.size < expected) {
					// Virtuoso loads the next page when the last row nears the viewport.
					await table.rows().last().scrollIntoViewIfNeeded({ timeout: 2_000 });
					await page.mouse.wheel(0, 4_000);
				}
				expect(seen.size).toBeGreaterThanOrEqual(expected);
			}).toPass({ timeout: SEEDED_DATA_TIMEOUT, intervals: [500] });
			return [...seen];
		},

		openColumns: async () => {
			await page.getByTestId(FORMAT_OPTIONS).click();
			await page.getByTestId('periscope-btn-edit-columns').click();
			await expect(page.getByPlaceholder('Search for a field...')).toBeVisible();
		},

		addColumn: async (key) => {
			const searchBox = page.getByPlaceholder('Search for a field...');
			await searchBox.fill(key);
			// The Add buttons carry no testid, and the search is debounced, so pick
			// the button inside the row naming `key` (the innermost matching div).
			const item = page
				.locator('div')
				.filter({ has: page.getByText(key, { exact: true }) })
				.filter({ has: page.getByRole('button', { name: 'Add', exact: true }) })
				.last();
			await item.hover();
			await item.getByRole('button', { name: 'Add', exact: true }).click();
			await page.getByRole('button', { name: 'Save changes' }).click();
			await expect(logs.toast('Saved successfully')).toBeVisible();
		},

		download: async (format) => {
			await page.getByTestId('periscope-btn-download-logs').click();
			await page.getByRole('radio', { name: format, exact: true }).click();
			const [file] = await Promise.all([
				page.waitForEvent('download'),
				page.getByRole('button', { name: 'Export', exact: true }).click(),
			]);
			return {
				name: file.suggestedFilename(),
				text: fs.readFileSync(await file.path(), 'utf8'),
			};
		},

		copyRowLink: async (row) => {
			await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
			await row.hover();
			await row.getByTestId('log-line-copy-link').click();
			await expect(logs.toast('Copied to clipboard')).toBeVisible();
			return page.evaluate(() => navigator.clipboard.readText());
		},

		seedRow: (service, body, offsetMs = 0) =>
			seedOne(page.request, service, body, offsetMs),

		toast: (text) => page.getByText(text, { exact: true }),

		reload: async () => {
			await page.reload();
			await expect(page.getByTestId(FORMAT_OPTIONS)).toBeVisible();
		},

		openInNewTab: async (url) => {
			const tab = await page.context().newPage();
			await tab.goto(url);
			return tab;
		},

		rowById: (logId, target = page) =>
			target.getByTestId(LIST).locator(`[data-testid$="-row-${logId}"]`),

		openTab: async (name) => {
			await page.getByRole('tab', { name }).first().click();
		},

		gotoIndexFields: async () => {
			await page.goto('/logs-explorer/index-fields');
			await expect(page.getByRole('tab', { name: 'Index Fields' })).toBeVisible();
		},

		// The linked-row scenarios read a second tab, so every locator takes an
		// optional page and defaults to this driver's own.
		rows: (target = page) => target.locator(`[data-testid^="${ROW_PREFIX}"]`),
		row: (logId, target = page) => target.getByTestId(`${ROW_PREFIX}${logId}`),

		highlightedRows: (target = page) =>
			logs.rows(target).and(target.locator(`.${LINKED_ROW_CLASS}`)),

		unhighlightedRows: (target = page) =>
			target.locator(`[data-testid^="${ROW_PREFIX}"]:not(.${LINKED_ROW_CLASS})`),

		activeLogId: (target = page) => {
			const value = new URL(target.url()).searchParams.get('activeLogId');
			if (!value) {
				throw new Error(`No activeLogId in URL: ${target.url()}`);
			}
			return value.replace(/"/g, '');
		},

		detailsDrawer: (target = page) => target.getByTestId(LOG_DETAIL_DRAWER),

		clickRowFirstCell: async (row) => {
			await row.locator('td').first().click();
		},

		openDetailsFromRow: async (row) => {
			await logs.clickRowFirstCell(row);
			await expect(logs.detailsDrawer(row.page())).toBeVisible();
		},

		openContextView: async () => {
			await page
				.getByTestId('log-detail-views-tabs')
				.getByText('Context', { exact: true })
				.click();
			await expect(contextItems().first()).toBeVisible();
		},

		openFirstContextLogInNewTab: async () => {
			const [newTab] = await Promise.all([
				page.context().waitForEvent('page'),
				contextItems().first().click(),
			]);
			await newTab.waitForLoadState();
			return newTab;
		},
	};

	return logs;
}
