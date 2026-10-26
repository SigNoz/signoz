/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator } from '@playwright/test';

import {
	buildDashboard,
	type EditorControl,
	GOLDEN,
	heatmapPoints,
	heatmapTooltipAt,
	heatmapQuery,
	metricsQuery,
	NEW_KINDS_MARKDOWN,
	type Panel,
	panel,
	type PanelHandle,
	PanelKind,
	type PostableDashboard,
	QueryRange,
	type QueryRangeBody,
	type QueryRangeMock,
	QueryTab,
	ramp,
	rawQuery,
	RENDERER_TESTID,
	Section,
	type Signal,
	SINGLE_PANEL_ID,
	type ThresholdVariant,
} from './panel-config';

// One row per panel kind, every value read off the kind's definition.ts and
// sections.ts (and capabilities.ts for the query matrix). The contract specs
// generate one test per row, so a new kind is one row here.

export type QueryType = 'builder' | 'clickhouse' | 'promql';

export type DownloadFormat = 'CSV' | 'PNG' | 'SVG';

/**
 * Every collapsible section title. Text's PanelHeader section is left out: it
 * renders inline in Panel Details, with no toggle of its own.
 */
export const ALL_SECTIONS: string[] = Object.values(Section);

/** The axis controls a kind can declare; Heatmap has `y-scale` only. */
export const AXIS_CONTROLS: EditorControl[] = [
	'soft-min',
	'soft-max',
	'log-scale',
	'y-scale',
];

export interface PanelKindCase {
	kind: PanelKind;
	/** `displayName`: the picker tile, switcher option and tooltip wording. */
	label: string;
	renderer: string;
	/** Renders from its own spec: no query, so no data states. */
	queryless: boolean;
	/** The panel as seeded; renders against golden data. */
	panel(): Panel;
	/** A one-panel dashboard holding `panel()` under SINGLE_PANEL_ID. */
	seed(): PostableDashboard;
	/** A mocked result the kind renders; null when queryless. */
	body(): QueryRangeBody | null;
	/** A mocked successful result with nothing in it; null when queryless. */
	emptyBody(): QueryRangeBody | null;
	/** Number renders the shared empty state under its own testid. */
	noDataTestId: string;
	sections: string[];
	forbiddenSections: string[];
	/** Visualization declares the time-preference control. */
	timePreference: boolean;
	/** Axis controls shown once Axes opens; the rest of AXIS_CONTROLS are absent. */
	axisControls: EditorControl[];
	queryTabs: string[];
	/** Query types the switcher accepts, AI excluded. */
	queryTypes: QueryType[];
	/** Builder signals the switcher accepts. */
	signals: Signal[];
	downloads: DownloadFormat[];
	createAlert: boolean;
	drilldown: boolean;
	/** The kind's data gesture: what a drilldown would hang off. */
	click(target: PanelHandle): Promise<void>;
	headerSearch: boolean;
	thresholdVariant: ThresholdVariant | null;
	columnsEditor: boolean;
}

const BUCKETS = [10, 50, 100, 500];

const ALL_SIGNALS: Signal[] = ['metrics', 'logs', 'traces'];
const ALL_TABS = [
	QueryTab.builder,
	QueryTab.clickhouse,
	QueryTab.promql,
	QueryTab.ai,
];
const IMAGES: DownloadFormat[] = ['PNG', 'SVG'];

const CHART_SECTIONS = [
	Section.visualization,
	Section.formatting,
	Section.axes,
	Section.legend,
	Section.thresholds,
	Section.contextLinks,
];

function oneSeries(): QueryRangeBody {
	return QueryRange.timeSeries([
		{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
	]);
}

function serviceScalar(rows: (string | number)[][]): QueryRangeBody {
	return QueryRange.scalar({
		groupColumns: ['service.name'],
		aggregationColumns: ['A'],
		rows,
	});
}

function singlePanel(content: Panel): PostableDashboard {
	return buildDashboard({
		sections: [{ title: 'Section', panels: { [SINGLE_PANEL_ID]: content } }],
	});
}

type RowInput = Omit<
	PanelKindCase,
	'renderer' | 'seed' | 'forbiddenSections' | 'noDataTestId'
> &
	Partial<Pick<PanelKindCase, 'noDataTestId'>>;

function row(input: RowInput): PanelKindCase {
	return {
		noDataTestId: 'panel-no-data',
		...input,
		renderer: RENDERER_TESTID[input.kind],
		seed: () => singlePanel(input.panel()),
		forbiddenSections: ALL_SECTIONS.filter(
			(title) => !input.sections.includes(title),
		),
	};
}

const clickChartPoint = (target: PanelHandle): Promise<void> =>
	target.chart.clickPoint();
const clickChart = (target: PanelHandle): Promise<void> => target.chart.click();

/**
 * A slice's bounding-box centre can fall in the donut hole, so this clicks the
 * centroid, where the slice's label leader line starts.
 */
async function clickPieSlice(target: PanelHandle): Promise<void> {
	const leader = target
		.renderer(PanelKind.PieChart)
		.locator('svg g line')
		.first();
	const { x, y } = await leader.evaluate((node) => {
		const line = node as SVGLineElement;
		const matrix = line.getScreenCTM();
		const point = new DOMPoint(
			line.x1.baseVal.value,
			line.y1.baseVal.value,
		).matrixTransform(matrix ?? undefined);
		return { x: point.x, y: point.y };
	});
	await target.root().page().mouse.click(x, y);
}

/** Waits for the cell tooltip, so a missing menu is not a click that missed. */
async function clickHeatmapCell(target: PanelHandle): Promise<void> {
	await target.chart.click();
	await expect(heatmapTooltipAt(target.root().page()).root()).toBeVisible();
}

export const PANEL_KINDS: PanelKindCase[] = [
	row({
		kind: PanelKind.TimeSeries,
		label: 'Time Series',
		queryless: false,
		panel: () => panel(PanelKind.TimeSeries, { name: 'Calls by service' }),
		body: oneSeries,
		emptyBody: () => QueryRange.empty(),
		sections: [...CHART_SECTIONS, Section.chartAppearance],
		timePreference: true,
		axisControls: ['soft-min', 'soft-max', 'log-scale'],
		queryTabs: ALL_TABS,
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: true,
		drilldown: true,
		click: clickChartPoint,
		headerSearch: false,
		thresholdVariant: 'label',
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.BarChart,
		label: 'Bar Chart',
		queryless: false,
		panel: () => panel(PanelKind.BarChart, { name: 'Calls bar' }),
		body: oneSeries,
		emptyBody: () => QueryRange.empty(),
		sections: CHART_SECTIONS,
		timePreference: true,
		axisControls: ['soft-min', 'soft-max', 'log-scale'],
		queryTabs: ALL_TABS,
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: true,
		drilldown: true,
		click: clickChartPoint,
		headerSearch: false,
		thresholdVariant: 'label',
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.AreaChart,
		label: 'Area Chart',
		queryless: false,
		panel: () => panel(PanelKind.AreaChart, { name: 'Calls area' }),
		body: oneSeries,
		emptyBody: () => QueryRange.empty(),
		sections: [...CHART_SECTIONS, Section.chartAppearance],
		timePreference: true,
		axisControls: ['soft-min', 'soft-max', 'log-scale'],
		queryTabs: ALL_TABS,
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: true,
		drilldown: true,
		click: clickChartPoint,
		headerSearch: false,
		thresholdVariant: 'label',
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.Histogram,
		label: 'Histogram',
		queryless: false,
		panel: () =>
			panel(PanelKind.Histogram, {
				name: 'Latency distribution',
				query: metricsQuery({ metricName: GOLDEN.metrics.latencySum, groupBy: [] }),
			}),
		body: oneSeries,
		emptyBody: () => QueryRange.empty(),
		sections: [
			Section.visualization,
			Section.legend,
			Section.buckets,
			Section.contextLinks,
		],
		timePreference: false,
		axisControls: [],
		queryTabs: ALL_TABS,
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: true,
		drilldown: false,
		click: clickChart,
		headerSearch: false,
		thresholdVariant: null,
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.Number,
		label: 'Number',
		queryless: false,
		panel: () =>
			panel(PanelKind.Number, {
				name: 'Total calls',
				pluginSpec: { formatting: { unit: 'short', decimalPrecision: '2' } },
				query: metricsQuery({ groupBy: [] }),
			}),
		body: () => QueryRange.scalar({ aggregationColumns: ['A'], rows: [[1234]] }),
		emptyBody: () => QueryRange.scalar({ aggregationColumns: ['A'], rows: [] }),
		noDataTestId: 'number-panel-no-data',
		sections: [
			Section.visualization,
			Section.formatting,
			Section.thresholds,
			Section.contextLinks,
		],
		timePreference: true,
		axisControls: [],
		queryTabs: ALL_TABS,
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: true,
		drilldown: true,
		// The whole renderer is the click target.
		click: (target) => target.renderer(PanelKind.Number).click(),
		headerSearch: false,
		thresholdVariant: 'comparison',
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.PieChart,
		label: 'Pie Chart',
		queryless: false,
		panel: () => panel(PanelKind.PieChart, { name: 'Calls share' }),
		body: () =>
			serviceScalar([
				['adservice', 10],
				['cartservice', 20],
			]),
		emptyBody: () => serviceScalar([]),
		sections: [
			Section.visualization,
			Section.formatting,
			Section.legend,
			Section.contextLinks,
		],
		timePreference: true,
		axisControls: [],
		queryTabs: [QueryTab.builder, QueryTab.clickhouse, QueryTab.ai],
		queryTypes: ['builder', 'clickhouse'],
		signals: ALL_SIGNALS,
		downloads: IMAGES,
		createAlert: false,
		drilldown: true,
		click: clickPieSlice,
		headerSearch: false,
		thresholdVariant: null,
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.Table,
		label: 'Table',
		queryless: false,
		panel: () => panel(PanelKind.Table, { name: 'Calls table' }),
		body: () =>
			serviceScalar([
				['adservice', 10],
				['cartservice', 20],
			]),
		emptyBody: () => serviceScalar([]),
		sections: [
			Section.visualization,
			Section.formatting,
			Section.thresholds,
			Section.contextLinks,
		],
		timePreference: true,
		axisControls: [],
		queryTabs: [QueryTab.builder, QueryTab.clickhouse, QueryTab.ai],
		queryTypes: ['builder', 'clickhouse'],
		signals: ALL_SIGNALS,
		downloads: ['CSV', ...IMAGES],
		createAlert: false,
		drilldown: true,
		click: (target) => target.table.rows().first().locator('td').last().click(),
		headerSearch: true,
		thresholdVariant: 'table',
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.List,
		label: 'List',
		queryless: false,
		panel: () =>
			panel(PanelKind.List, {
				name: 'Recent logs',
				pluginSpec: {
					selectFields: [
						{ name: 'timestamp', signal: 'logs' },
						{ name: 'body', signal: 'logs' },
					],
				},
				query: rawQuery({ signal: 'logs' }),
			}),
		body: () =>
			QueryRange.raw(
				Array.from({ length: 3 }, (_, i) => ({
					timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
					body: `log line ${i}`,
					'service.name': 'adservice',
				})),
			),
		emptyBody: () => QueryRange.raw([]),
		sections: [Section.visualization],
		timePreference: false,
		axisControls: [],
		queryTabs: [QueryTab.builder, QueryTab.ai],
		queryTypes: ['builder'],
		signals: ['logs', 'traces'],
		downloads: IMAGES,
		createAlert: false,
		drilldown: false,
		click: (target) =>
			target.renderer(PanelKind.List).getByText('log line 0').click(),
		headerSearch: true,
		thresholdVariant: null,
		columnsEditor: true,
	}),
	row({
		kind: PanelKind.Heatmap,
		label: 'Heatmap',
		queryless: false,
		panel: () =>
			panel(PanelKind.Heatmap, { name: 'Calls heatmap', query: heatmapQuery() }),
		body: () =>
			QueryRange.heatmap(BUCKETS, [
				{
					labels: { 'service.name': 'adservice' },
					points: heatmapPoints(12, BUCKETS.length + 1),
				},
			]),
		// Bucket bounds but no series: the heatmap's own empty body.
		emptyBody: () => QueryRange.heatmap(BUCKETS, []),
		sections: [
			Section.visualization,
			Section.chartAppearance,
			Section.formatting,
			Section.axes,
			Section.legend,
		],
		timePreference: true,
		axisControls: ['y-scale'],
		queryTabs: [QueryTab.builder, QueryTab.clickhouse, QueryTab.promql],
		queryTypes: ['builder', 'clickhouse', 'promql'],
		signals: ['metrics'],
		downloads: IMAGES,
		createAlert: false,
		drilldown: false,
		click: clickHeatmapCell,
		headerSearch: false,
		thresholdVariant: null,
		columnsEditor: false,
	}),
	row({
		kind: PanelKind.Text,
		label: 'Text',
		queryless: true,
		panel: () =>
			panel(PanelKind.Text, {
				name: 'Runbook',
				pluginSpec: { text: NEW_KINDS_MARKDOWN },
			}),
		body: () => null,
		emptyBody: () => null,
		sections: [Section.visualization, Section.panelAppearance],
		timePreference: false,
		axisControls: [],
		queryTabs: [],
		queryTypes: [],
		signals: [],
		downloads: [],
		createAlert: false,
		drilldown: false,
		click: (target) => target.markdown.root().click(),
		headerSearch: false,
		thresholdVariant: null,
		columnsEditor: false,
	}),
];

export interface NoDataState {
	root(): Locator;
	action(): Locator;
	secondaryAction(): Locator;
}

/** The kind's empty state; its actions take the state's testid as a prefix. */
export function noDataOf(c: PanelKindCase, target: PanelHandle): NoDataState {
	const byTestId = (suffix: string): Locator =>
		target.root().getByTestId(`${c.noDataTestId}${suffix}`);
	return {
		root: () => byTestId(''),
		action: () => byTestId('-action'),
		secondaryAction: () => byTestId('-secondary-action'),
	};
}

export const QUERYABLE_KINDS = PANEL_KINDS.filter((c) => !c.queryless);

export function kindCase(kind: PanelKind): PanelKindCase {
	const match = PANEL_KINDS.find((c) => c.kind === kind);
	if (!match) {
		throw new Error(`no PANEL_KINDS row for ${kind}`);
	}
	return match;
}

/**
 * The kind's panel under SINGLE_PANEL_ID, below a tall queryless filler so it
 * starts outside the viewport.
 */
export function belowTheFold(c: PanelKindCase): PostableDashboard {
	const dashboard = buildDashboard({
		sections: [
			{
				title: 'Section',
				panels: {
					filler: panel(PanelKind.Text, { name: 'Filler' }),
					[SINGLE_PANEL_ID]: c.panel(),
				},
			},
		],
	});
	const [layout] = dashboard.spec.layouts;
	layout.spec.items = [
		{ ...layout.spec.items[0], x: 0, y: 0, width: 12, height: 40 },
		{ ...layout.spec.items[1], x: 0, y: 40 },
	];
	return dashboard;
}

/** Serves the kind's mocked result; a queryless kind sends no query to serve. */
export async function respondWithData(
	queryRange: QueryRangeMock,
	c: PanelKindCase,
): Promise<void> {
	const body = c.body();
	if (body) {
		await queryRange.respond(body);
	}
}

/** The kind's panel plus an empty second section, so Move to section has a target. */
export function withSpareSection(c: PanelKindCase): PostableDashboard {
	return buildDashboard({
		sections: [
			{ title: 'Section', panels: { [SINGLE_PANEL_ID]: c.panel() } },
			{ title: 'Spare', panels: {} },
		],
	});
}

/**
 * The switcher's reason for refusing `c`, or null when it accepts: the query
 * type is checked before the signal (getPanelTypeDisabledReason).
 */
export function disabledReason(
	c: PanelKindCase,
	source: { queryType: QueryType; signal?: Signal },
): string | null {
	if (c.queryless) {
		return null;
	}
	if (!c.queryTypes.includes(source.queryType)) {
		const label = {
			builder: 'Query Builder',
			clickhouse: 'ClickHouse',
			promql: 'PromQL',
		}[source.queryType];
		return `${c.label} isn't available for ${label} queries`;
	}
	if (source.signal && !c.signals.includes(source.signal)) {
		return `${c.label} doesn't support ${source.signal} data`;
	}
	return null;
}

export * from './panel-config';
