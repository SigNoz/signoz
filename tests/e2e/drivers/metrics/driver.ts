import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { antdDriver } from '../antd';
import { apiDriver } from '../api';
import {
	dashboardsDriver,
	panelEditorDriver,
	type Dashboards,
	type PanelEditor,
} from '../dashboards';
import { driver, SEEDED_DATA_TIMEOUT, type Layer } from '../kit';
import { querySearchDriver, type QuerySearch } from '../querysearch';
import { savedViewsDriver, type SavedViews } from '../savedviews';
import type {
	MetricreductionruletypesGettableReductionRuleDTO,
	MetricsexplorertypesMetricMetadataDTO,
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapRequestDTO,
	MetricsexplorertypesUpdateMetricMetadataRequestDTO,
} from '../schemas';
import { readJson } from '../storage';

import {
	scopeExpression,
	seedMetric,
	type MetricSpec,
	type MetricsCatalogSeed,
} from './seeds';

/**
 * The metrics explorer: the summary list and treemap, the metric details drawer,
 * inspect, the query explorer and the volume-control tab.
 */

export const SUMMARY_PATH = '/metrics-explorer/summary';
export const EXPLORER_PATH = '/metrics-explorer/explorer';
export const VOLUME_CONTROL_PATH = '/metrics-explorer/volume-control';

const STATS_API = '/api/v2/metrics/stats';
const TREEMAP_API = '/api/v2/metrics/treemap';
const METADATA_API = '/api/v2/metrics/metadata';
const RULES_API = '/api/v2/metric_reduction_rules';
const QUERY_RANGE_API = '/api/v5/query_range';
/** `usePageSize('metricsExplorer')`. */
const PAGE_SIZE_KEY = 'k8s-metricsExplorer-page-size';

export type StatsRequest = MetricsexplorertypesStatsRequestDTO;
export type TreemapRequest = MetricsexplorertypesTreemapRequestDTO;
export type MetadataUpdate = MetricsexplorertypesUpdateMetricMetadataRequestDTO;
export type MetricMetadata = MetricsexplorertypesMetricMetadataDTO;
export type ReductionRule = MetricreductionruletypesGettableReductionRuleDTO;

export type SummaryTab = 'Summary' | 'Explorer' | 'Volume Control';
export type SummaryColumn =
	| 'METRIC'
	| 'DESCRIPTION'
	| 'TYPE'
	| 'UNIT'
	| 'SAMPLES'
	| 'TIME SERIES';
export type MetadataField =
	| 'description'
	| 'unit'
	| 'type'
	| 'temporality'
	| 'isMonotonic';

const COLUMN_INDEX: Record<SummaryColumn, number> = {
	METRIC: 0,
	DESCRIPTION: 1,
	TYPE: 2,
	UNIT: 3,
	SAMPLES: 4,
	'TIME SERIES': 5,
};

const isPost =
	(path: string) =>
	(request: Request): boolean =>
		request.method() === 'POST' && new URL(request.url()).pathname === path;

function body<T>(request: Request): T {
	return request.postDataJSON() as T;
}

/** An antd single select: open, optionally search, pick the exact label. */
async function pickSingle(
	page: Page,
	select: Locator,
	label: string,
	search?: string,
): Promise<void> {
	const antd = antdDriver(page);
	await select.click();
	if (search !== undefined) {
		await select.locator('input[role="combobox"]').fill(search);
	}
	const dropdown = await antd.ownDropdown(select);
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ has: page.getByText(label, { exact: true }) })
		.first()
		.click();
	await expect(select).not.toHaveClass(/ant-select-open/);
}

export function toast(page: Page, text: string | RegExp): Locator {
	return page.locator('.ant-notification-notice').filter({ hasText: text });
}

// ─── Summary, details, inspect ───────────────────────────────────────────────

export interface MetricDetails {
	drawer(): Locator;
	title(): Locator;
	samples(): Locator;
	timeSeries(): Locator;
	lastReceived(): Locator;
	openInExplorer(): Promise<void>;
	inspectButton(): Locator;
	inspect(): Promise<void>;
	attributeKey(key: string): Locator;
	attributeValue(key: string, value: string): Locator;
	attributesSearch(text: string): Promise<void>;
}

export interface MetadataEditor {
	editButton(): Locator;
	saveButton(): Locator;
	edit(): Promise<void>;
	cancel(): Promise<void>;
	/** Save and resolve the POST, whatever its status. */
	save(): Promise<{ body: MetadataUpdate; response: Response }>;
	setType(label: string): Promise<void>;
	setTemporality(label: string): Promise<void>;
	/** `label` is the unit's display name, e.g. "Bytes (B)". */
	setUnit(label: string): Promise<void>;
	setDescription(text: string): Promise<void>;
	value(field: MetadataField): Locator;
}

export interface InspectDrawer {
	root(): Locator;
	seriesCount(): Locator;
	empty(): Locator;
	toggleView(): Promise<void>;
	viewLabel(label: 'Graph View' | 'Table View'): Locator;
	runButton(): Locator;
}

export interface Metrics {
	/** Seed a one-off metric with its own run stamp. Returns its name and scope. */
	seedMetric(
		spec: Omit<MetricSpec, 'name' | 'series'> & { prefix: string },
	): Promise<{ name: string; scope: string }>;
	gotoSummary(params?: Record<string, string>): Promise<void>;
	tab(name: SummaryTab): Locator;
	search(): QuerySearch;
	/** Apply `expression` and wait for the stats response that carries it. */
	scopeTo(expression: string): Promise<void>;
	/** Arm before acting: the next stats request whose body passes `match`. */
	nextStatsRequest(
		match?: (body: StatsRequest) => boolean,
	): Promise<StatsRequest>;
	nextTreemapRequest(
		match?: (body: TreemapRequest) => boolean,
	): Promise<TreemapRequest>;
	/** Re-run the scoped query until every row in `names` is listed. */
	waitForRows(names: string[]): Promise<void>;
	table(): Locator;
	row(name: string): Locator;
	cell(name: string, column: SummaryColumn): Locator;
	rowOrder(names: string[]): Promise<string[]>;
	sortBy(column: 'SAMPLES' | 'TIME SERIES'): Promise<void>;
	setPageSize(size: number): Promise<void>;
	storedPageSize(): Promise<number | null>;
	treemap(): Locator;
	setTreemapMode(label: 'Time Series' | 'Samples'): Promise<void>;
	tile(name: string): Locator;
	/** The METRIC column's search popover: type, then pick `name`. */
	searchMetricName(name: string): Promise<void>;
	openDetails(name: string): Promise<void>;
	closeDetails(): Promise<void>;
	details: MetricDetails;
	metadata: MetadataEditor;
	inspectDrawer: InspectDrawer;
	metadataFromApi(name: string): Promise<MetricMetadata>;
	toast(text: string | RegExp): Locator;
}

export function metricsDriver(page: Page): Metrics {
	const api = apiDriver(page);
	const search = querySearchDriver(page, {
		runTestId: 'metrics-summary-run-query',
	});
	const table = (): Locator => page.getByTestId('metrics-table');
	const drawer = (): Locator =>
		page
			.getByRole('dialog')
			.filter({ has: page.getByTestId('metric-details-title') });

	const nextRequest = <T>(path: string, match: (b: T) => boolean): Promise<T> =>
		page
			.waitForRequest(
				(request) => isPost(path)(request) && match(body<T>(request)),
			)
			.then((request) => body<T>(request));

	const details: MetricDetails = {
		drawer,
		title: () => page.getByTestId('metric-details-title'),
		samples: () => page.getByTestId('metric-highlights-data-points'),
		timeSeries: () => page.getByTestId('metric-highlights-time-series-total'),
		lastReceived: () => page.getByTestId('metric-highlights-last-received'),

		openInExplorer: async () => {
			const button = page.getByTestId('open-in-explorer-button');
			await expect(button).toBeEnabled();
			// The button opens the explorer in a new tab; replay its URL here so
			// the explorer driver stays on this page.
			const [popup] = await Promise.all([
				page.context().waitForEvent('page'),
				button.click(),
			]);
			await popup.waitForURL(new RegExp(EXPLORER_PATH));
			const url = popup.url();
			await popup.close();
			await page.goto(url);
		},

		inspectButton: () => page.getByTestId('inspect-metric-button'),

		inspect: async () => {
			await expect(details.inspectButton()).toBeEnabled();
			await details.inspectButton().click();
			await expect(page.getByTestId('inspect-metrics-content')).toBeVisible();
		},

		attributeKey: (key) => page.getByTestId(`attribute-key-${key}`),

		attributeValue: (key, value) =>
			page
				.getByTestId('all-attributes-table')
				.locator('tr')
				.filter({ has: details.attributeKey(key) })
				.getByRole('button', { name: value, exact: true }),

		attributesSearch: async (text) => {
			await page.getByTestId('all-attributes-search').fill(text);
		},
	};

	const metadata: MetadataEditor = {
		editButton: () => page.getByTestId('metadata-edit-button'),
		saveButton: () => page.getByTestId('metadata-save-button'),

		edit: async () => {
			await expect(metadata.editButton()).toBeEnabled({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			await metadata.editButton().click();
			await expect(metadata.saveButton()).toBeVisible();
		},

		cancel: async () => {
			await page.getByTestId('metadata-cancel-button').click();
			await expect(metadata.editButton()).toBeVisible();
		},

		save: async () => {
			const response = page.waitForResponse((res) =>
				isPost(METADATA_API)(res.request()),
			);
			await metadata.saveButton().click();
			const res = await response;
			return { body: body<MetadataUpdate>(res.request()), response: res };
		},

		setType: (label) =>
			pickSingle(page, page.getByTestId('metric-type-select'), label),
		setTemporality: (label) =>
			pickSingle(page, page.getByTestId('temporality-select'), label),
		setUnit: (label) =>
			pickSingle(
				page,
				page.getByTestId('unit-select'),
				label,
				label.split(' ')[0],
			),
		setDescription: async (text) => {
			await page.getByTestId('description-input').fill(text);
		},

		value: (field) =>
			page
				.getByTestId('metric-metadata-table')
				.locator(`tr[data-row-key="${field}"] td`)
				.nth(1),
	};

	const inspectDrawer: InspectDrawer = {
		root: () => page.getByTestId('inspect-metrics-content'),
		seriesCount: () => page.getByTestId('inspect-time-series-count'),
		empty: () => page.getByTestId('inspect-metrics-empty'),
		toggleView: async () => {
			await page.getByTestId('inspect-view-toggle').click();
		},
		viewLabel: (label) => inspectDrawer.root().getByText(label, { exact: true }),
		runButton: () => page.getByTestId('inspect-run-query'),
	};

	const metrics: Metrics = {
		seedMetric: async ({ prefix, ...spec }) => {
			const run = `t${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
			const name = `${prefix}_${run}`;
			await seedMetric(page.request, {
				...spec,
				name,
				series: [{ resource: { 'e2e.run': run, 'service.name': `e2e-mx-${run}` } }],
			});
			return { name, scope: scopeExpression(run) };
		},

		gotoSummary: async (params = {}) => {
			const query = new URLSearchParams({ relativeTime: '1h', ...params });
			await page.goto(`${SUMMARY_PATH}?${query.toString()}`);
			await expect(page.getByTestId('metrics-table-title')).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
		},

		tab: (name) => page.getByRole('tab', { name }),
		search: () => search,

		scopeTo: async (expression) => {
			const stats = page.waitForResponse(
				(res) =>
					isPost(STATS_API)(res.request()) &&
					body<StatsRequest>(res.request()).filter?.expression === expression,
			);
			await search.apply(expression);
			expect((await stats).ok()).toBe(true);
		},

		nextStatsRequest: (match = () => true) => nextRequest(STATS_API, match),
		nextTreemapRequest: (match = () => true) => nextRequest(TREEMAP_API, match),

		// Seeded rows can land in ClickHouse after the first stats response, and
		// the summary never re-polls on its own.
		waitForRows: async (names) => {
			await expect(async () => {
				const missing = [];
				for (const name of names) {
					// eslint-disable-next-line no-await-in-loop
					if (!(await metrics.row(name).isVisible())) {
						missing.push(name);
					}
				}
				if (missing.length > 0) {
					await search.run();
				}
				for (const name of names) {
					// eslint-disable-next-line no-await-in-loop
					await expect(metrics.row(name)).toBeVisible({ timeout: 3_000 });
				}
			}).toPass({ timeout: SEEDED_DATA_TIMEOUT });
		},

		table,
		row: (name) => table().locator(`tr[data-row-key="${name}"]`),
		cell: (name, column) =>
			metrics.row(name).locator('td').nth(COLUMN_INDEX[column]),

		rowOrder: async (names) => {
			const keys = await table()
				.locator('tr[data-row-key]')
				.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-key')));
			return keys.filter((key): key is string => !!key && names.includes(key));
		},

		sortBy: async (column) => {
			await table().locator('th').filter({ hasText: column }).click();
		},

		setPageSize: async (size) => {
			const changer = page
				.locator('.ant-pagination-options')
				.locator('.ant-select')
				.first();
			await changer.click();
			await page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.locator('.ant-select-item-option')
				.filter({ hasText: `${size} / page` })
				.click();
		},

		storedPageSize: () => readJson<number>(page, PAGE_SIZE_KEY),

		treemap: () =>
			page.getByTestId('metrics-treemap-container').locator('svg').first(),

		setTreemapMode: (label) =>
			pickSingle(page, page.getByTestId('metrics-treemap-view-select'), label),

		tile: (name) => page.getByTestId(`metrics-treemap-tile-${name}`),

		searchMetricName: async (name) => {
			await page.getByTestId('metric-name-search-button').click();
			await page.getByTestId('metric-name-search-input').fill(name);
			await page.getByRole('menuitem', { name, exact: true }).first().click();
		},

		// A row click can land while the list re-renders from a second stats
		// response, which drops the click; retry until the drawer shows the name.
		openDetails: async (name) => {
			await expect(metrics.row(name)).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			await expect(async () => {
				if (!(await details.title().isVisible())) {
					await metrics.row(name).click();
				}
				await expect(details.title()).toHaveText(name, { timeout: 2_000 });
			}).toPass({ timeout: 15_000 });
		},

		closeDetails: async () => {
			await drawer().getByRole('button', { name: 'Close' }).click();
			await expect(details.title()).toHaveCount(0);
			await expect(page).toHaveURL(/isMetricDetailsOpen=false/);
		},

		details,
		metadata,
		inspectDrawer,

		metadataFromApi: async (name) =>
			(
				await api.get<{ data: MetricMetadata }>(
					`${METADATA_API}?metricName=${encodeURIComponent(name)}`,
				)
			).data,

		toast: (text) => toast(page, text),
	};

	return metrics;
}

// ─── Query explorer ──────────────────────────────────────────────────────────

export interface MetricsExplorer {
	goto(params?: Record<string, string>): Promise<void>;
	metricSelector(index?: number): Locator;
	metricInput(index?: number): Locator;
	pickMetric(name: string, index?: number): Promise<void>;
	/** Open the metric dropdown and return its options. */
	openMetricOptions(index?: number): Promise<Locator>;
	groupBy(attribute: string): Promise<void>;
	/** Press Run and resolve the first `query_range` response it sends. */
	run(): Promise<Response>;
	/** Arm before acting: the next `query_range` response whose body names `metric`. */
	nextQueryFor(metric: string): Promise<Response>;
	charts(): Locator;
	firstChartCanvas(): Locator;
	emptyState(): Locator;
	noData(): Locator;
	legendLabels(): Promise<string[]>;
	createAlertButton(): Locator;
	addToDashboardButton(): Locator;
	/** Add the current query to `title` through the export dialog. */
	addToDashboard(title: string): Promise<void>;
	createAlert(): Promise<void>;
	/** The `compositeQuery` URL param, fully decoded. */
	compositeQueryFromUrl(): string;
	/** Dashboards and the panel editor, for the add-to-dashboard round trip. */
	dashboards: Dashboards;
	panelEditor: PanelEditor;
}

export function isQueryRange(request: Request): boolean {
	return isPost(QUERY_RANGE_API)(request);
}

export function metricsExplorerDriver(
	page: Page,
	{ path = EXPLORER_PATH }: { path?: string } = {},
): MetricsExplorer {
	const antd = antdDriver(page);
	const selector = (index = 0): Locator =>
		page.getByTestId(`metric-name-selector-${index}`);

	const explorer: MetricsExplorer = {
		goto: async (params = {}) => {
			const query = new URLSearchParams({ relativeTime: '1h', ...params });
			await page.goto(`${path}?${query.toString()}`);
			await expect(selector()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		},

		metricSelector: selector,
		metricInput: (index = 0) => selector(index).locator('input'),

		openMetricOptions: async (index = 0) => {
			await selector(index).click();
			return (await antd.ownDropdown(selector(index))).locator(
				'.ant-select-item-option',
			);
		},

		pickMetric: async (name, index = 0) => {
			await selector(index).click();
			await explorer.metricInput(index).fill(name);
			const option = (await antd.ownDropdown(selector(index)))
				.locator('.ant-select-item-option')
				.filter({ hasText: name })
				.first();
			await option.click({ timeout: SEEDED_DATA_TIMEOUT });
			await expect(explorer.metricInput(index)).toHaveValue(name);
		},

		groupBy: (attribute) =>
			antd.pickByName(page.getByTestId('group-by').first(), attribute),

		run: async () => {
			const response = page.waitForResponse((res) => isQueryRange(res.request()));
			await page.getByTestId('explorer-run-query-btn').click();
			return response;
		},

		nextQueryFor: (metric) =>
			page.waitForResponse(
				(res) =>
					isQueryRange(res.request()) &&
					(res.request().postData() ?? '').includes(metric),
			),

		charts: () => page.getByTestId('time-series-graph'),
		firstChartCanvas: () =>
			page.getByTestId('time-series-graph').first().locator('canvas').first(),
		emptyState: () =>
			page.getByText('Select a metric and run a query to see the results', {
				exact: true,
			}),
		noData: () => page.getByText('No data', { exact: true }),

		// The explorer's chart is the v1 Uplot, whose legend is uPlot's own table.
		legendLabels: () =>
			page
				.locator('.u-legend tr.u-series th')
				.evaluateAll((items) => items.map((item) => item.textContent ?? '')),

		createAlertButton: () => page.getByTestId('explorer-create-alert'),
		addToDashboardButton: () => page.getByTestId('explorer-add-to-dashboard'),

		addToDashboard: async (title) => {
			await explorer.addToDashboardButton().click();
			const dialog = page.getByTestId('export-panel-dialog');
			await expect(dialog).toBeVisible();
			const select = page.getByTestId('export-dashboard-select');
			await select.click();
			await select.locator('input[role="combobox"]').fill(title);
			await (
				await antd.ownDropdown(select)
			)
				.locator('.ant-select-item-option')
				.filter({ hasText: title })
				.first()
				.click();
			await page.getByTestId('export-panel-export').click();
			await expect(page).toHaveURL(/\/dashboard\/[^/]+\/panel\//);
		},

		createAlert: async () => {
			await explorer.createAlertButton().click();
			await expect(page).toHaveURL(/\/alerts\/new\?compositeQuery=/);
		},

		compositeQueryFromUrl: () => {
			const raw = new URL(page.url()).searchParams.get('compositeQuery') ?? '';
			try {
				return decodeURIComponent(raw);
			} catch {
				return raw;
			}
		},

		dashboards: dashboardsDriver(page),
		panelEditor: panelEditorDriver(page),
	};

	return explorer;
}

// ─── Volume control ──────────────────────────────────────────────────────────

export type RuleMode = 'all' | 'include' | 'exclude';

export interface VolumeControl {
	/** Whether `enable_metrics_reduction` is active on this stack. */
	available(): Promise<boolean>;
	seedRule(
		metricName: string,
		matchType: 'keep' | 'drop',
		labels: string[],
	): Promise<string>;
	/** Re-post the catalog gauge so its newest sample is inside the tab's 15m window. */
	reseedGauge(seed: MetricsCatalogSeed): Promise<void>;
	rulesFor(metricName: string): Promise<ReductionRule[]>;
	removeRulesFor(metricName: string): Promise<void>;
	gotoTab(): Promise<void>;
	/** Type into the search box and wait for the debounced list response. */
	search(text: string): Promise<void>;
	tab(): Locator;
	stats(): Locator;
	chart(): Locator;
	empty(): Locator;
	row(metric: string): Locator;
	mode(metric: string): Locator;
	badge(metric: string, state: 'active' | 'pending'): Locator;
	/** Open the config drawer for `metric` from the tab. */
	manage(metric: string): Promise<void>;
	drawer: {
		root(): Locator;
		mode(mode: RuleMode): Promise<void>;
		pickLabels(labels: string[]): Promise<void>;
		impact(): Locator;
		/** Save and resolve the rule write (POST, or PUT for an existing rule). */
		save(): Promise<Response>;
		/** Remove and resolve the DELETE. */
		remove(): Promise<Response>;
		cancel(): Promise<void>;
	};
	section: {
		root(): Locator;
		setup(): Promise<void>;
		edit(): Promise<void>;
		pendingBanner(): Locator;
		active(): Locator;
	};
	toast(text: string | RegExp): Locator;
}

const isRuleWrite = (response: Response): boolean => {
	const { pathname } = new URL(response.url());
	return (
		pathname.startsWith(RULES_API) &&
		!pathname.endsWith('/preview') &&
		['POST', 'PUT', 'DELETE'].includes(response.request().method())
	);
};

export function volumeControlDriver(page: Page): VolumeControl {
	const api = apiDriver(page);
	const antd = antdDriver(page);
	const tab = (): Locator => page.getByTestId('volume-control-tab');
	const drawerRoot = (): Locator =>
		page.getByTestId('volume-control-config-drawer');

	const vc: VolumeControl = {
		available: async () => {
			const flags = await api.get<{ data: { name: string; active: boolean }[] }>(
				'/api/v1/features',
			);
			return flags.data.some(
				(flag) => flag.name === 'enable_metrics_reduction' && flag.active,
			);
		},

		seedRule: (metricName, matchType, labels) =>
			api.create(RULES_API, { metricName, matchType, labels }),

		reseedGauge: async (seed) => {
			await seedMetric(page.request, {
				name: seed.gauge,
				type: 'Gauge',
				unit: 'By',
				description: 'e2e gauge',
				points: 5,
				series: seed.services.map((service, i) => ({
					labels: { host: `h${i + 1}` },
					resource: { 'e2e.run': seed.run, 'service.name': service },
				})),
			});
		},

		rulesFor: async (metricName) =>
			(
				await api.get<{ data: { rules: ReductionRule[] | null } }>(
					`${RULES_API}?metricName=${encodeURIComponent(metricName)}`,
				)
			).data.rules ?? [],

		removeRulesFor: async (metricName) => {
			const rules = await vc.rulesFor(metricName);
			await Promise.all(
				rules.map((rule) => api.tryDel(`${RULES_API}/${rule.id}`)),
			);
		},

		gotoTab: async () => {
			// The tab has no time picker and ignores the URL range, and seeded
			// series fall outside the default 15m window, so the drawer's attribute
			// list would come back empty. Widen the range on the summary and arrive
			// through the tab.
			await page.goto(`${SUMMARY_PATH}?relativeTime=30m`);
			await page.getByRole('tab', { name: 'Volume Control' }).click();
			await expect(tab()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		},

		search: async (text) => {
			const listed = page.waitForResponse((res) => {
				const url = new URL(res.url());
				return (
					url.pathname === RULES_API &&
					res.request().method() === 'GET' &&
					url.searchParams.get('search') === text
				);
			});
			await page.getByTestId('volume-control-search').fill(text);
			expect((await listed).ok()).toBe(true);
		},

		tab,
		stats: () => page.getByTestId('volume-control-stats'),
		chart: () => page.getByTestId('volume-control-chart'),
		empty: () => page.getByTestId('volume-control-tab-empty'),
		row: (metric) => tab().locator(`tr[data-row-key="${metric}"]`),
		// METRIC, STATUS, MODE: the table's column order.
		mode: (metric) => vc.row(metric).locator('td').nth(2),
		badge: (metric, state) => vc.row(metric).getByTestId(`vc-badge-${state}`),

		manage: async (metric) => {
			await page.getByTestId(`volume-control-manage-${metric}`).click();
			await expect(drawerRoot()).toBeVisible();
		},

		drawer: {
			root: drawerRoot,
			mode: async (mode) => {
				await page.getByTestId(`volume-control-mode-${mode}`).click();
			},
			pickLabels: async (labels) => {
				const select = page.getByTestId('volume-control-label-select');
				for (const label of labels) {
					// Escape would close the drawer along with the dropdown, so close
					// the dropdown by clicking the field's label instead.
					// eslint-disable-next-line no-await-in-loop
					await expect(select).not.toHaveClass(/ant-select-loading/);
					const before = await antd.selectedTags(select).count();
					await select.click();
					await select.locator('input[role="combobox"]').fill(label);
					const dropdown = await antd.ownDropdown(select);
					const option = dropdown
						.locator('.ant-select-item-option')
						.filter({ hasText: label })
						.first();
					await expect(
						option,
						`attribute key "${label}" never listed: the metric has no sample in the tab's 15m window`,
					).toBeVisible({ timeout: 20_000 });
					await option.click();
					await drawerRoot().getByText('Attributes', { exact: true }).click();
					await expect(select).not.toHaveClass(/ant-select-open/);
					await expect(antd.selectedTags(select)).toHaveCount(before + 1);
				}
			},
			impact: () => page.getByTestId('volume-control-impact'),
			save: async () => {
				const written = page.waitForResponse(isRuleWrite);
				await page.getByTestId('volume-control-save').click();
				return written;
			},
			remove: async () => {
				const removed = page.waitForResponse(
					(res) => isRuleWrite(res) && res.request().method() === 'DELETE',
				);
				await page.getByTestId('volume-control-remove').click();
				return removed;
			},
			cancel: async () => {
				await page.getByTestId('volume-control-cancel').click();
				await expect(drawerRoot()).toHaveCount(0);
			},
		},

		section: {
			root: () => page.getByTestId('volume-control-section'),
			setup: async () => {
				await page.getByTestId('volume-control-setup').click();
				await expect(drawerRoot()).toBeVisible();
			},
			edit: async () => {
				await page.getByTestId('volume-control-edit').click();
				await expect(drawerRoot()).toBeVisible();
			},
			pendingBanner: () => page.getByTestId('volume-control-pending-banner'),
			active: () => page.getByTestId('volume-control-active'),
		},

		toast: (text) => toast(page, text),
	};

	return vc;
}

// ─── Layers ──────────────────────────────────────────────────────────────────

export const withMetrics: Layer<{ metrics: Metrics }> = driver(
	'metrics',
	({ page }) => metricsDriver(page),
);

export const withMetricsExplorer: Layer<{ metricsExplorer: MetricsExplorer }> =
	driver('metricsExplorer', ({ page }) => metricsExplorerDriver(page));

export const withSavedViews: Layer<{ savedViews: SavedViews }> = driver(
	'savedViews',
	({ page }) => savedViewsDriver(page, 'metrics'),
);

export const withVolumeControl: Layer<{ volumeControl: VolumeControl }> =
	driver('volumeControl', ({ page }) => volumeControlDriver(page));
