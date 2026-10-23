// Typed builders for the V2 (Perses-shaped) dashboard spec — pure data, no
// Playwright. Mirrors Go's `dashboardtypes.DashboardSpec`.
//
// Three server rules that surface as an opaque 400:
//   1. POST decodes with DisallowUnknownFields — any stray key rejects it all.
//   2. Every panel needs EXACTLY ONE query; Text needs `queries: []`.
//   3. Panel keys match /^[a-zA-Z0-9_.-]+$/, so readable ids double as test
//      handles (`panel-actions-${id}`).

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

export type Signal = 'metrics' | 'logs' | 'traces';

// ─── Queries ─────────────────────────────────────────────────────────────

export interface MetricAggregation {
	metricName: string;
	timeAggregation: string;
	spaceAggregation: string;
	reduceTo: string;
}

/** Logs/traces aggregations are expression-shaped ("count()"), not metric-shaped. */
export interface ExpressionAggregation {
	expression: string;
}

export interface OrderBy {
	key: { name: string };
	direction: 'asc' | 'desc';
}

export interface BuilderQuerySpec {
	name: string;
	signal: Signal;
	aggregations: (MetricAggregation | ExpressionAggregation)[];
	filter?: { expression: string };
	groupBy?: { name: string }[];
	order?: OrderBy[];
	limit?: number;
}

export type QueryPlugin =
	| { kind: 'signoz/BuilderQuery'; spec: BuilderQuerySpec }
	| { kind: 'signoz/PromQLQuery'; spec: { name: string; query: string } }
	| { kind: 'signoz/ClickHouseSQL'; spec: { name: string; query: string } };

/**
 * List reads `raw`, Heatmap `heatmap`; every other kind reads `time_series`.
 * Mixing them renders empty.
 */
export type QueryResultKind = 'time_series' | 'raw' | 'heatmap';

export interface Query {
	kind: QueryResultKind;
	spec: { plugin: QueryPlugin };
}

// ─── Panel plugin specs ──────────────────────────────────────────────────

export interface Threshold {
	value: number;
	color: string;
	operator?:
		| 'above'
		| 'aboveOrEqual'
		| 'below'
		| 'belowOrEqual'
		| 'equal'
		| 'notEqual';
	format?: 'background' | 'text';
	unit?: string;
	label?: string;
	columnName?: string;
}

export type StackMode = 'none' | 'normal' | 'percent';

export type HeatmapPalette =
	| 'ice'
	| 'moss'
	| 'rust'
	| 'graphite'
	| 'ember'
	| 'lagoon'
	| 'orchid'
	| 'verdant'
	| 'lava'
	| 'beacon';

export interface HeatmapColors {
	mode?: 'palette' | 'opacity';
	palette?: HeatmapPalette;
	scale?: 'log' | 'sqrt' | 'linear';
	/** 2–128. */
	steps?: number;
	minCount?: number | null;
	maxCount?: number | null;
	/** Opacity mode only. */
	fill?: string;
}

export interface TextPresentation {
	textAlign?: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'center' | 'bottom';
	/** A hex colour. */
	background?: string;
}

/**
 * One bag for every kind; the server's strict decoder rejects a key the kind
 * does not declare, so a mismatch fails the seed rather than rendering wrong.
 */
export interface PanelPluginSpec {
	visualization?: {
		timePreference?: string;
		fillSpans?: boolean;
		stackedBarChart?: boolean;
		/** Area only. */
		stack?: StackMode;
	};
	formatting?: {
		unit?: string;
		decimalPrecision?: string;
		columnUnits?: Record<string, string>;
	};
	axes?: {
		softMin?: number | null;
		softMax?: number | null;
		isLogScale?: boolean;
		/** Heatmap only, and its only axis key. */
		y?: { scale: 'auto' | 'linear' | 'log' | 'symlog' };
	};
	legend?: {
		position?: 'bottom' | 'right';
		customColors?: Record<string, string>;
	};
	chartAppearance?: {
		lineStyle?: 'solid' | 'dashed';
		lineInterpolation?: 'linear' | 'spline' | 'step_before' | 'step_after';
		/** Area drops `none`. */
		fillMode?: 'none' | 'solid' | 'gradient';
		/** Area only, 0–1. */
		fillOpacity?: number;
		showPoints?: boolean;
		spanGaps?: { fillOnlyBelow?: boolean; fillLessThan?: string };
		/** Heatmap only, and its only appearance key. */
		colors?: HeatmapColors;
	};
	histogramBuckets?: {
		bucketCount?: number;
		bucketWidth?: number;
		mergeAllActiveQueries?: boolean;
	};
	selectFields?: { name: string; signal?: Signal; fieldDataType?: string }[];
	thresholds?: Threshold[];
	/** Text only. */
	mode?: 'markdown';
	text?: string;
	presentation?: TextPresentation;
	headerOptions?: { hide: boolean };
}

/**
 * Perses' link model — NOT the editor dialog's field names. The dialog labels
 * its first field "Label", but it persists as `name`; there is no `label` key
 * and the strict decoder rejects one.
 */
export interface ContextLink {
	name: string;
	url: string;
	tooltip?: string;
	renderVariables?: boolean;
	targetBlank?: boolean;
}

export interface Panel {
	kind: 'Panel';
	spec: {
		display: { name: string; description?: string };
		links: ContextLink[];
		plugin: { kind: PanelKind; spec: PanelPluginSpec };
		/** Empty for Text, exactly one query for every other kind. */
		queries: Query[];
	};
}

// ─── Layout ──────────────────────────────────────────────────────────────

export interface GridItem {
	x: number;
	y: number;
	width: number;
	height: number;
	content: { $ref: string };
}

export interface Layout {
	kind: 'Grid';
	spec: { display: { title: string }; items: GridItem[] };
}

// ─── Variables ───────────────────────────────────────────────────────────

export type Variable =
	| {
			kind: 'ListVariable';
			spec: {
				name: string;
				display: { name: string };
				allowAllValue: boolean;
				allowMultiple: boolean;
				sort: 'none' | 'alphabetical-asc' | 'alphabetical-desc';
				plugin:
					| { kind: 'signoz/CustomVariable'; spec: { customValue: string } }
					| { kind: 'signoz/QueryVariable'; spec: { queryValue: string } }
					| {
							kind: 'signoz/DynamicVariable';
							spec: { name: string; signal: Signal };
					  };
			};
	  }
	| {
			kind: 'TextVariable';
			spec: { name: string; display: { name: string }; value: string };
	  };

// ─── Dashboard ───────────────────────────────────────────────────────────

export interface DashboardSpec {
	display: { name: string; description?: string };
	variables: Variable[];
	panels: Record<string, Panel>;
	layouts: Layout[];
	links: ContextLink[];
	duration?: string;
}

export interface Tag {
	key: string;
	value: string;
}

export interface PostableDashboardV2 {
	schemaVersion: 'v6';
	/** Must be EMPTY when `generateName` is true; the server derives it. */
	name: string;
	generateName: boolean;
	tags: Tag[];
	spec: DashboardSpec;
}

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
		dbLatencyCount: 'signoz_db_latency_count',
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
	environment: 'production',
	/** Golden telemetry spans the last 6 hours, so windows wider than this add nothing. */
	windowHours: 6,
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
	 * Defaults to a metrics query shaped for the kind: `raw` for List, `heatmap`
	 * for Heatmap. Ignored for Text, which carries none.
	 */
	query?: Query;
	links?: ContextLink[];
}

function defaultQueryFor(kind: PanelKind): Query {
	if (kind === PanelKind.List) {
		return rawQuery();
	}
	if (kind === PanelKind.Heatmap) {
		return heatmapQuery();
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
	duration?: string;
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
export function dashboardV2(
	options: DashboardFixtureOptions,
): PostableDashboardV2 {
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

	const title = options.title ?? `v2-dashboard-${nextFixtureId()}`;
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
			...(options.duration === undefined ? {} : { duration: options.duration }),
		},
	};
}
