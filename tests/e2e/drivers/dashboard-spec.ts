// Typed builders for the (Perses-shaped) dashboard spec — pure data, no
// Playwright. The types live in `dashboard-spec.types.ts`.
//
// Three server rules that surface as an opaque 400:
//   1. POST decodes with DisallowUnknownFields — any stray key rejects it all.
//   2. Every panel needs EXACTLY ONE query; Text needs `queries: []`.
//   3. Panel keys match /^[a-zA-Z0-9_.-]+$/, so readable ids double as test
//      handles (`panel-actions-${id}`).

import type {
	ContextLink,
	GridItem,
	Layout,
	Panel,
	PanelPluginSpec,
	PostableDashboard,
	Query,
	Signal,
	Tag,
	Variable,
} from './dashboard-spec.types';

// ─── Kinds ───────────────────────────────────────────────────────────────

export const PanelKind = {
	TimeSeries: 'signoz/TimeSeriesPanel',
	BarChart: 'signoz/BarChartPanel',
	AreaChart: 'signoz/AreaChartPanel',
	Histogram: 'signoz/HistogramPanel',
	Number: 'signoz/NumberPanel',
	PieChart: 'signoz/PieChartPanel',
	Table: 'signoz/TablePanel',
	List: 'signoz/ListPanel',
	Heatmap: 'signoz/HeatmapPanel',
	Text: 'signoz/TextPanel',
} as const;

export type PanelKind = (typeof PanelKind)[keyof typeof PanelKind];

/** The backend pins this; a mismatch fails validation before anything else. */
export const SCHEMA_VERSION = 'v6' as const;

// ─── Golden-dataset constants ────────────────────────────────────────────
//
// What `seed/golden` writes: four metrics over 8 services, 6h of 5-min buckets.

export const GOLDEN = {
	metrics: {
		calls: 'signoz_calls_total',
		latencyCount: 'signoz_latency_count',
		latencySum: 'signoz_latency_sum',
	},
	services: [
		'adservice',
		'cartservice',
		'checkoutservice',
		'currencyservice',
		'frontend',
		'paymentservice',
		'productcatalogservice',
		'shippingservice',
	],
} as const;

// ─── Query builders ──────────────────────────────────────────────────────

/** A rate-over-counter metrics query grouped by service — the default fixture query. */
export function metricsQuery(options?: {
	name?: string;
	metricName?: string;
	timeAggregation?: string;
	spaceAggregation?: string;
	reduceTo?: string;
	filter?: string;
	groupBy?: string[];
}): Query {
	return {
		kind: 'time_series',
		spec: {
			plugin: {
				kind: 'signoz/BuilderQuery',
				spec: {
					name: options?.name ?? 'A',
					signal: 'metrics',
					aggregations: [
						{
							metricName: options?.metricName ?? GOLDEN.metrics.calls,
							timeAggregation: options?.timeAggregation ?? 'rate',
							spaceAggregation: options?.spaceAggregation ?? 'sum',
							reduceTo: options?.reduceTo ?? 'sum',
						},
					],
					filter: { expression: options?.filter ?? '' },
					groupBy: (options?.groupBy ?? ['service.name']).map((name) => ({
						name,
					})),
				},
			},
		},
	};
}

/** A `raw` logs/traces query for List panels — ordered newest-first like the UI seeds it. */
export function rawQuery(options?: {
	name?: string;
	signal?: Extract<Signal, 'logs' | 'traces'>;
	filter?: string;
	limit?: number;
}): Query {
	const signal = options?.signal ?? 'logs';
	return {
		kind: 'raw',
		spec: {
			plugin: {
				kind: 'signoz/BuilderQuery',
				spec: {
					name: options?.name ?? 'A',
					signal,
					aggregations: [{ expression: 'count()' }],
					filter: { expression: options?.filter ?? '' },
					groupBy: [],
					order: [
						{ key: { name: 'timestamp' }, direction: 'desc' },
						{ key: { name: 'id' }, direction: 'desc' },
					],
					...(options?.limit === undefined ? {} : { limit: options.limit }),
				},
			},
		},
	};
}

/**
 * A logs/traces `count()` shaped as `time_series` — what Table and the chart
 * kinds read (unlike `rawQuery`, which only List consumes). Also the only
 * non-metrics seed that saves without picking a metric.
 */
export function logsCountQuery(options?: {
	name?: string;
	signal?: Extract<Signal, 'logs' | 'traces'>;
	filter?: string;
	groupBy?: string[];
}): Query {
	return {
		kind: 'time_series',
		spec: {
			plugin: {
				kind: 'signoz/BuilderQuery',
				spec: {
					name: options?.name ?? 'A',
					signal: options?.signal ?? 'logs',
					aggregations: [{ expression: 'count()' }],
					filter: { expression: options?.filter ?? '' },
					groupBy: (options?.groupBy ?? ['service.name']).map((name) => ({
						name,
					})),
				},
			},
		},
	};
}

/** A metrics builder query shaped as `heatmap`, the only result kind Heatmap reads. */
export function heatmapQuery(
	options?: Parameters<typeof metricsQuery>[0],
): Query {
	return { ...metricsQuery(options), kind: 'heatmap' };
}

export function promqlQuery(query: string, name = 'A'): Query {
	return {
		kind: 'time_series',
		spec: { plugin: { kind: 'signoz/PromQLQuery', spec: { name, query } } },
	};
}

export function clickhouseQuery(query: string, name = 'A'): Query {
	return {
		kind: 'time_series',
		spec: { plugin: { kind: 'signoz/ClickHouseSQL', spec: { name, query } } },
	};
}

// ─── Panel builder ───────────────────────────────────────────────────────

export interface PanelOptions {
	name: string;
	description?: string;
	pluginSpec?: PanelPluginSpec;
	/**
	 * Defaults to a metrics query shaped for the kind's result type. Ignored for
	 * Text, which carries none.
	 */
	query?: Query;
	links?: ContextLink[];
}

const SCALAR_KINDS: PanelKind[] = [
	PanelKind.Number,
	PanelKind.PieChart,
	PanelKind.Table,
];

function defaultQueryFor(kind: PanelKind): Query {
	if (kind === PanelKind.List) {
		return rawQuery();
	}
	if (kind === PanelKind.Heatmap) {
		return heatmapQuery();
	}
	if (SCALAR_KINDS.includes(kind)) {
		return { ...metricsQuery(), kind: 'scalar' };
	}
	return metricsQuery();
}

export function panel(kind: PanelKind, options: PanelOptions): Panel {
	return {
		kind: 'Panel',
		spec: {
			display: {
				name: options.name,
				...(options.description === undefined
					? {}
					: { description: options.description }),
			},
			links: options.links ?? [],
			plugin: { kind, spec: options.pluginSpec ?? {} },
			queries:
				kind === PanelKind.Text ? [] : [options.query ?? defaultQueryFor(kind)],
		},
	};
}

// ─── Dashboard composer ──────────────────────────────────────────────────

export interface SectionFixture {
	title: string;
	/** Keys become panel ids AND test handles, so keep them readable and unique. */
	panels: Record<string, Panel>;
}

export interface DashboardFixtureOptions {
	/** Defaults to a unique value; the server derives the internal name. */
	title?: string;
	description?: string;
	sections: SectionFixture[];
	variables?: Variable[];
	tags?: Tag[];
}

// pid distinguishes workers; the counter distinguishes seeds within one.
let fixtureSeq = 0;
function nextFixtureId(): string {
	fixtureSeq += 1;
	return `${process.pid}-${fixtureSeq}`;
}

/** Grid is 12 columns wide (SectionGrid `cols`), so 6×6 tiles two per row. */
const PANEL_WIDTH = 6;
const PANEL_HEIGHT = 6;
const GRID_COLS = 12;
const PER_ROW = GRID_COLS / PANEL_WIDTH;

/** Two panels per row. Duplicate ids across sections are rejected loudly. */
export function buildDashboard(
	options: DashboardFixtureOptions,
): PostableDashboard {
	const panels: Record<string, Panel> = {};
	const layouts: Layout[] = [];

	for (const section of options.sections) {
		const items: GridItem[] = [];
		let index = 0;
		for (const [id, panelSpec] of Object.entries(section.panels)) {
			if (panels[id]) {
				throw new Error(`duplicate panel id ${id} in dashboard fixture`);
			}
			panels[id] = panelSpec;
			items.push({
				x: (index % PER_ROW) * PANEL_WIDTH,
				y: Math.floor(index / PER_ROW) * PANEL_HEIGHT,
				width: PANEL_WIDTH,
				height: PANEL_HEIGHT,
				content: { $ref: `#/spec/panels/${id}` },
			});
			index += 1;
		}
		layouts.push({
			kind: 'Grid',
			spec: { display: { title: section.title }, items },
		});
	}

	const title = options.title ?? `e2e-dashboard-${nextFixtureId()}`;
	return {
		schemaVersion: SCHEMA_VERSION,
		name: '',
		generateName: true,
		tags: options.tags ?? [],
		spec: {
			display: {
				name: title,
				...(options.description === undefined
					? {}
					: { description: options.description }),
			},
			variables: options.variables ?? [],
			panels,
			layouts,
			links: [],
		},
	};
}
