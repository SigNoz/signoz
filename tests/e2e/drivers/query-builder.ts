/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import {
	expect,
	type Locator,
	type Page,
	type Request,
} from '@playwright/test';

import { ownDropdown } from '../helpers/alert-forms/shared';
import { postToSeeder } from '../helpers/alerts/seeding';
import { watchConsole, type ConsoleWatch } from '../helpers/common';
import { isQueryRange } from '../helpers/query-range-mock';
import { dismissQuickFiltersAnnouncement } from '../helpers/quick-filters';

import { driver, kit, seeded } from './kit';

export const EXPLORER = {
	logs: '/logs/logs-explorer',
	traces: '/traces-explorer',
	metrics: '/metrics-explorer/explorer',
} as const;

/** A monotonic Sum in the golden dataset. */
export const SUM_METRIC = 'signoz_calls_total';
/** Another golden Sum, for switching between metrics of one type. */
export const OTHER_SUM_METRIC = 'signoz_latency_count';

/** The golden dataset has only Sums; these are seeded per worker. */
export interface MetricTypes {
	gauge: string;
	histogram: string;
}

/** Inside the golden dataset's window. */
export const RELATIVE_TIME = '6h';

/** One entry of a v5 `query_range` body's `compositeQuery.queries`. */
export interface V5Query {
	type: string;
	spec: {
		name?: string;
		signal?: string;
		disabled?: boolean;
		filter?: { expression?: string };
		aggregations?: { expression?: string }[];
		groupBy?: { name: string }[];
		having?: { expression?: string };
		order?: { key: { name: string }; direction: string }[];
		limit?: number;
		stepInterval?: number;
		[key: string]: unknown;
	};
}

export interface V5Body {
	requestType: string;
	compositeQuery: { queries: V5Query[] };
}

export interface FilterEditor {
	root(): Locator;
	/** The contenteditable CodeMirror surface. */
	content(): Locator;
	/** Replaces the expression by typing it key by key. */
	type(text: string): Promise<void>;
	/** Appends at the caret without clearing. */
	append(text: string): Promise<void>;
	clear(): Promise<void>;
	press(key: string): Promise<void>;
	/** The document text, placeholder excluded, lines joined with `\n`. */
	expression(): Promise<string>;
	lineCount(): Locator;
	/** The open autocomplete popup. */
	suggestions(): Locator;
	/**
	 * Ctrl+Space: opens the popup at the caret. Typing opens it only once the
	 * debounced key fetch answers, which a loaded stack can delay past a test's
	 * next step.
	 */
	openSuggestions(): Promise<void>;
	suggestion(label: string | RegExp): Locator;
}

export interface QueryBlock {
	root(): Locator;
	filter: FilterEditor;
	/** The filter's status icon: shown only while unfocused and non-empty. */
	filterStatus(): Locator;
	aggregation: FilterEditor;
	/** The aggregation's "every … Seconds" input. */
	step(): Locator;
	metric: MetricControls;
	addOns: AddOns;
}

/** `query-add-on-<field>` toggle values: a documented DOM contract. */
export type AddOnField =
	| 'group_by'
	| 'having'
	| 'order_by'
	| 'limit'
	| 'legend_format'
	| 'reduce_to';

export interface AddOns {
	/** The toggle row; its children name the add-ons on offer. */
	toggles(): Locator;
	/** Idempotent: leaves an already-open add-on open. */
	open(field: AddOnField): Promise<void>;
	content(field: AddOnField): Locator;
	groupBy: {
		/** Types `key` and picks the suggestion with that exact name. */
		add(key: string): Promise<void>;
		remove(key: string): Promise<void>;
		/** The selected keys, in order. */
		values(): Promise<string[]>;
	};
	having: FilterEditor;
	limit(): Locator;
	legend(): Locator;
}

/** The metrics aggregation section: metric picker plus time/space selects. */
export interface MetricControls {
	select(name: string): Promise<void>;
	/** The selected value. Absent for histograms. */
	timeAggregation(): Locator;
	/** The selected value. */
	spaceAggregation(): Locator;
	setTimeAggregation(label: string): Promise<void>;
	setSpaceAggregation(label: string): Promise<void>;
	/** Labels offered by the space-aggregation select, as shown. */
	spaceOptions(): Promise<string[]>;
}

export interface QuickFilterValue {
	checkbox(): Locator;
	/** Toggles the value; returns the query_range bodies the toggle fired. */
	toggle(): Promise<V5Body[]>;
}

/** The explorer's tab, carried in the `panelTypes` param. */
export type ExplorerView = 'list' | 'graph' | 'table';

export interface OpenOptions {
	/** Serialised the way the app writes it. */
	query?: unknown;
	/** A `compositeQuery` value sent as given, for malformed input. */
	raw?: string;
	view?: ExplorerView;
}

export interface QueryBuilderDriver {
	/**
	 * Resolves once the page's own first query_range has answered: the explorer
	 * rewrites its URL and re-mounts the builder until then, which drops
	 * keystrokes. Returns the bodies that load fired.
	 */
	openExplorer(path: string, options?: OpenOptions): Promise<V5Body[]>;
	query(name: string): QueryBlock;
	/** Adds the next query (B, C, …) and waits for its block. */
	addQuery(name: string): Promise<QueryBlock>;
	traceOperator: {
		root(): Locator;
		/** "Add Trace Matching": offered on traces hosts that allow it. */
		add(): Promise<void>;
		editor: FilterEditor;
	};
	/**
	 * Explorer "Add to dashboard": picks the dashboard titled `title` and waits
	 * for the new-panel editor the export navigates to.
	 */
	addToDashboard(title: string): Promise<void>;
	runButton(): Locator;
	/** Clicks Run; returns every query_range body the click fired. */
	run(): Promise<V5Body[]>;
	/**
	 * Ctrl/Cmd+Enter from the focused field; returns the fired bodies. Waits two
	 * frames first: editor changes reach React state on its next scheduler task,
	 * and a keypress inside the same frame as the last keystroke reads the
	 * previous render — a gap no person can produce.
	 */
	runShortcut(): Promise<V5Body[]>;
	/** A value in an explorer's checkbox quick filter, by its header title. */
	quickFilter(title: string, value: string): QuickFilterValue;
	/** The spec of query `name` in the first body that has it. */
	spec(bodies: V5Body[], name: string): V5Query['spec'];
	/** Every query_range body sent since the test started. */
	sent(): V5Body[];
	/** The URL's `compositeQuery`, parsed. */
	urlQuery(): Record<string, unknown> | null;
	console: ConsoleWatch;
}

/** CodeMirror renders its placeholder inside the empty line. */
const EDITOR_DOC = async (root: Locator): Promise<string> => {
	const lines = root.locator('.cm-content .cm-line');
	const texts = await lines.allTextContents();
	const placeholders = await lines.evaluateAll((nodes) =>
		nodes.map((node) => node.querySelector('.cm-placeholder')?.textContent ?? ''),
	);
	return texts
		.map((text, i) =>
			placeholders[i] ? text.replace(placeholders[i], '') : text,
		)
		.join('\n');
};

function editorAt(page: Page, root: () => Locator): FilterEditor {
	const content = (): Locator => root().locator('.cm-content');
	const editor: FilterEditor = {
		root,
		content,
		async type(text) {
			await editor.clear();
			await page.keyboard.type(text);
		},
		async append(text) {
			await content().click();
			await page.keyboard.press('End');
			await page.keyboard.type(text);
		},
		async clear() {
			await content().click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Backspace');
			await expect.poll(() => EDITOR_DOC(root())).toBe('');
		},
		press: (key) => page.keyboard.press(key),
		expression: () => EDITOR_DOC(root()),
		lineCount: () => root().locator('.cm-line'),
		suggestions: () => page.locator('.cm-tooltip-autocomplete'),
		async openSuggestions() {
			await expect(async () => {
				await page.keyboard.press('Control+Space');
				await expect(editor.suggestions()).toBeVisible({ timeout: 2_000 });
			}).toPass({ timeout: 15_000 });
		},
		suggestion: (label) =>
			page
				.locator('.cm-tooltip-autocomplete [role="option"]')
				.filter({ hasText: label }),
	};
	return editor;
}

/**
 * Opens the antd select inside `select` and returns its options. Scoped to the
 * list the select owns: a previous select's list can still be mid-close.
 */
async function openSelect(page: Page, select: Locator): Promise<Locator> {
	await select.locator('.ant-select-selector').click();
	const list = await ownDropdown(page, select);
	await expect(list).toBeVisible();
	return list.locator('.ant-select-item-option');
}

/** antd renders select options with trailing whitespace ("Sum "). */
const exactly = (label: string): RegExp => new RegExp(`^\\s*${label}\\s*$`);

const ADD_ON_CONTENT: Record<AddOnField, string> = {
	group_by: 'group-by-content',
	having: 'having-content',
	order_by: 'order-by-content',
	limit: 'limit-content',
	legend_format: 'legend-format-content',
	reduce_to: 'reduce-to-content',
};

function addOnsAt(page: Page, root: () => Locator): AddOns {
	const content = (field: AddOnField): Locator =>
		root().getByTestId(ADD_ON_CONTENT[field]);
	const groupBy = (): Locator => root().getByTestId('group-by');
	const addOns: AddOns = {
		toggles: () => root().locator('[data-testid^="query-add-on-"]'),
		async open(field) {
			if (await content(field).isVisible()) {
				return;
			}
			await root().getByTestId(`query-add-on-${field}`).click();
			await expect(content(field)).toBeVisible();
		},
		content,
		groupBy: {
			async add(key) {
				const options = await openSelect(page, groupBy());
				await groupBy().locator('input').fill(key);
				await options
					.filter({ hasText: exactly(key) })
					.first()
					.click();
				await page.keyboard.press('Escape');
				await expect(
					groupBy().locator('.ant-select-selection-item', { hasText: key }),
				).toBeVisible();
			},
			async remove(key) {
				await groupBy()
					.locator('.ant-select-selection-item', { hasText: key })
					.locator('.ant-select-selection-item-remove')
					.click();
			},
			async values() {
				const texts = await groupBy()
					.locator('.ant-select-selection-item-content')
					.allTextContents();
				return texts.map((text) => text.trim());
			},
		},
		having: editorAt(page, () => root().getByTestId('having-editor')),
		limit: () => content('limit').getByTestId('input-Limit'),
		legend: () => content('legend_format').getByTestId('input-Legend format'),
	};
	return addOns;
}

function metricAt(
	page: Page,
	root: () => Locator,
	index: number,
): MetricControls {
	const time = (): Locator => root().getByTestId('metrics-time-aggregation');
	const space = (): Locator => root().getByTestId('metrics-space-aggregation');
	return {
		async select(name) {
			// An antd AutoComplete: the testid is on a wrapper.
			const field = page.getByTestId(`metric-name-selector-${index}`);
			const options = await openSelect(page, field);
			await field.locator('input').fill(name);
			// Options carry the metric's type and unit next to its name.
			await options.filter({ hasText: name }).first().click();
		},
		// The selection item, not the root: these selects render their list
		// inside the root, so its text includes every option.
		timeAggregation: () => time().locator('.ant-select-selection-item'),
		spaceAggregation: () => space().locator('.ant-select-selection-item'),
		async setTimeAggregation(label) {
			const options = await openSelect(page, time());
			await options.filter({ hasText: exactly(label) }).click();
			await expect(this.timeAggregation()).toHaveText(label);
		},
		async setSpaceAggregation(label) {
			const options = await openSelect(page, space());
			await options.filter({ hasText: exactly(label) }).click();
			await expect(this.spaceAggregation()).toHaveText(label);
		},
		async spaceOptions() {
			const options = await openSelect(page, space());
			const labels = await options.allTextContents();
			await page.keyboard.press('Escape');
			return labels.map((label) => label.trim());
		},
	};
}

function queryBuilderDriver(page: Page): QueryBuilderDriver {
	const bodies: V5Body[] = [];
	page.on('request', (request: Request) => {
		if (isQueryRange(request.url()) && request.method() === 'POST') {
			bodies.push(request.postDataJSON() as V5Body);
		}
	});
	const consoleWatch = watchConsole(page, {
		// ANTLR reports every partial expression on console.error, prefixed
		// with its position (`line 1:14 ...`).
		ignore: ['line 1:', 'line 2:', 'line 3:'],
	});

	const firedBy = async (action: () => Promise<void>): Promise<V5Body[]> => {
		const before = bodies.length;
		await Promise.all([
			page.waitForResponse((r) => isQueryRange(r.url())),
			action(),
		]);
		return bodies.slice(before);
	};

	const qb: QueryBuilderDriver = {
		async openExplorer(path, { query, raw, view } = {}) {
			await dismissQuickFiltersAnnouncement(page);
			const params = [`relativeTime=${RELATIVE_TIME}`];
			if (view) {
				params.push(`panelTypes=${encodeURIComponent(JSON.stringify(view))}`);
			}
			const composite =
				raw ??
				(query === undefined
					? undefined
					: encodeURIComponent(JSON.stringify(query)));
			if (composite !== undefined) {
				params.push(`compositeQuery=${composite}`);
			}
			const url = `${path}?${params.join('&')}`;
			// The metrics explorer runs nothing until a metric is chosen; its
			// settle point is the metric list instead.
			if (path === EXPLORER.metrics) {
				await Promise.all([
					page.waitForResponse((r) => r.url().includes('/api/v2/metrics')),
					page.goto(url),
				]);
				await expect(qb.query('A').filter.content()).toBeVisible();
				return [];
			}
			const fired = await firedBy(async () => {
				await page.goto(url);
			});
			await expect(qb.query('A').filter.content()).toBeVisible();
			return fired;
		},
		query(name) {
			const root = (): Locator => page.getByTestId(`query-${name}`);
			return {
				root,
				filter: editorAt(page, () =>
					root().getByTestId('query-where-clause-editor'),
				),
				filterStatus: () => root().getByTestId('query-validation-status'),
				aggregation: editorAt(page, () =>
					root().getByTestId('query-aggregation-editor'),
				),
				step: () => root().getByTestId('input-Seconds'),
				metric: metricAt(page, root, name.charCodeAt(0) - 'A'.charCodeAt(0)),
				addOns: addOnsAt(page, root),
			};
		},
		async addQuery(name) {
			await page.getByTestId('add-new-query-button').click();
			const block = qb.query(name);
			await expect(block.filter.content()).toBeVisible();
			return block;
		},
		traceOperator: {
			root: () => page.getByTestId('trace-operator'),
			async add() {
				// No testid; the label is followed by a "Beta" tag inside the button.
				await page
					.getByRole('button')
					.filter({ hasText: /^Add Trace Matching/ })
					.click();
				await expect(qb.traceOperator.editor.content()).toBeVisible();
			},
			editor: editorAt(page, () => page.getByTestId('trace-operator-editor')),
		},
		async addToDashboard(title) {
			await page.getByTestId('explorer-add-to-dashboard').click();
			const dialog = page.getByTestId('export-panel-dialog');
			await dialog
				.getByTestId('export-dashboard-select')
				.locator('input')
				.fill(title);
			await dialog.locator(`.ant-select-item-option[title="${title}"]`).click();
			await dialog.getByTestId('export-panel-export').click();
			await page.waitForURL(/\/panel\/new\?/);
			await expect(qb.query('A').filter.content()).toBeVisible();
		},
		runButton: () => page.locator('[data-run-query-btn]').first(),
		run: () => firedBy(() => qb.runButton().click()),
		async runShortcut() {
			await page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						// Runs in the browser; the e2e tsconfig has no DOM lib.
						const { requestAnimationFrame: frame } = globalThis as unknown as {
							requestAnimationFrame(this: void, callback: () => void): number;
						};
						frame(() => frame(() => resolve()));
					}),
			);
			return firedBy(() => page.keyboard.press('ControlOrMeta+Enter'));
		},
		quickFilter(title, value) {
			const checkbox = (): Locator =>
				page.getByTestId(`checkbox-${title}-${value}`);
			return {
				checkbox,
				toggle: () => firedBy(() => checkbox().click()),
			};
		},
		spec(fired, name) {
			for (const body of fired) {
				const match = body.compositeQuery?.queries?.find(
					(q) => q.spec?.name === name,
				);
				if (match) {
					return match.spec;
				}
			}
			throw new Error(`no query ${name} in ${fired.length} query_range bodies`);
		},
		sent: () => bodies,
		urlQuery() {
			const raw = new URL(page.url()).searchParams.get('compositeQuery');
			if (!raw) {
				return null;
			}
			// The app encodes before URLSearchParams encodes again.
			return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
		},
		console: consoleWatch,
	};
	return qb;
}

/** Layers `qb` onto another host's test, e.g. the alert-rule fixtures. */
export const withQueryBuilder = driver('qb', ({ page }) =>
	queryBuilderDriver(page),
);

const HISTOGRAM_BOUNDS = ['1', '2', '4', '+Inf'];

/** Ten minutes of a gauge and a cumulative histogram, names unique per worker. */
export const withMetricTypes = seeded(
	'metricTypes',
	async ({ page, workerIndex }) => {
		const suffix = `${workerIndex}_${Date.now()}`;
		const types: MetricTypes = {
			gauge: `e2e_qb_gauge_${suffix}`,
			histogram: `e2e_qb_histogram_${suffix}`,
		};
		const now = Date.now();
		const points: Record<string, unknown>[] = [];
		for (let minute = 0; minute < 10; minute += 1) {
			const timestamp = new Date(now - (10 - minute) * 60_000).toISOString();
			points.push({
				metric_name: types.gauge,
				labels: { host: 'qb-host' },
				timestamp,
				value: 10 + minute,
				type_: 'Gauge',
				temporality: 'Unspecified',
				is_monotonic: false,
			});
			HISTOGRAM_BOUNDS.forEach((le, bucket) => {
				points.push({
					metric_name: types.histogram,
					labels: { le },
					timestamp,
					value: (minute + 1) * (bucket + 1),
					type_: 'Histogram',
					temporality: 'Cumulative',
					is_monotonic: false,
				});
			});
		}
		await postToSeeder(page, '/telemetry/metrics', points);
		return types;
	},
);

export const test = withQueryBuilder(kit);

export { expect } from './kit';
