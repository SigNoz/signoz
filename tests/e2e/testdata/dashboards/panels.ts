import {
	GOLDEN,
	PanelKind,
	clickhouseQuery,
	buildDashboard,
	heatmapQuery,
	metricsQuery,
	panel,
	promqlQuery,
	rawQuery,
	type ContextLink,
	type PanelPluginSpec,
	type PostableDashboard,
	type Query,
	type Variable,
} from '../../helpers/dashboard-spec';

// Dashboard fixtures for the dashboard suites. TypeScript rather than frozen JSON so
// a contract change is a compile error, and panel ids stay visible to the specs
// that use them as test handles.
let seq = 0;
function uniqueSuffix(): string {
	seq += 1;
	return `${process.pid}-${seq}`;
}

// ─── All kinds ───────────────────────────────────────────────────────────

export const ALL_KINDS_PANELS = {
	timeseries: 'ts-panel',
	bar: 'bar-panel',
	histogram: 'histogram-panel',
	number: 'number-panel',
	pie: 'pie-panel',
	table: 'table-panel',
	list: 'list-panel',
} as const;

/**
 * One panel of every kind. Only for "every kind renders" and lazy-load — use
 * `compactDashboard` otherwise; seven panels means seven real queries.
 */
export function allKindsDashboard(title?: string): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-all-kinds-${Date.now()}-${uniqueSuffix()}`,
		sections: [
			{
				title: 'Charts',
				panels: {
					[ALL_KINDS_PANELS.timeseries]: panel(PanelKind.TimeSeries, {
						name: 'Calls by service',
						description: 'Rate of signoz_calls_total grouped by service.name',
					}),
					[ALL_KINDS_PANELS.bar]: panel(PanelKind.BarChart, {
						name: 'Calls bar',
					}),
					[ALL_KINDS_PANELS.histogram]: panel(PanelKind.Histogram, {
						name: 'Latency distribution',
						query: metricsQuery({
							metricName: GOLDEN.metrics.latencySum,
							groupBy: [],
						}),
					}),
					[ALL_KINDS_PANELS.pie]: panel(PanelKind.PieChart, {
						name: 'Calls share',
					}),
				},
			},
			{
				title: 'Tabular',
				panels: {
					[ALL_KINDS_PANELS.number]: panel(PanelKind.Number, {
						name: 'Total calls',
						pluginSpec: { formatting: { unit: 'short', decimalPrecision: '2' } },
						query: metricsQuery({ groupBy: [] }),
					}),
					[ALL_KINDS_PANELS.table]: panel(PanelKind.Table, {
						name: 'Calls table',
					}),
					[ALL_KINDS_PANELS.list]: panel(PanelKind.List, {
						name: 'Recent logs',
						pluginSpec: {
							selectFields: [
								{ name: 'timestamp', signal: 'logs' },
								{ name: 'body', signal: 'logs' },
							],
						},
						query: rawQuery({ signal: 'logs' }),
					}),
				},
			},
		],
	});
}

// ─── Compact (default multi-panel fixture) ───────────────────────────────

export const COMPACT_PANELS = {
	timeseries: ALL_KINDS_PANELS.timeseries,
	table: ALL_KINDS_PANELS.table,
	list: ALL_KINDS_PANELS.list,
} as const;

/**
 * The default multi-panel fixture: three panels, two sections.
 *
 * Every panel fires its own `query_range`, and over-seeding was the dominant
 * load on the single-container stack. These three keep every distinction the
 * specs assert — TimeSeries (charts, zoom, drilldown, createAlert), Table (CSV
 * download, search), List (search, no createAlert) — and two sections keep
 * Move-to-section and the modal's select-then-confirm branch reachable.
 */
export function compactDashboard(title?: string): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-compact-${Date.now()}-${uniqueSuffix()}`,
		sections: [
			{
				title: 'Charts',
				panels: {
					[COMPACT_PANELS.timeseries]: panel(PanelKind.TimeSeries, {
						name: 'Calls by service',
						description: 'Rate of signoz_calls_total grouped by service.name',
					}),
				},
			},
			{
				title: 'Tabular',
				panels: {
					[COMPACT_PANELS.table]: panel(PanelKind.Table, {
						name: 'Calls table',
					}),
					[COMPACT_PANELS.list]: panel(PanelKind.List, {
						name: 'Recent logs',
						pluginSpec: {
							selectFields: [
								{ name: 'timestamp', signal: 'logs' },
								{ name: 'body', signal: 'logs' },
							],
						},
						query: rawQuery({ signal: 'logs' }),
					}),
				},
			},
		],
	});
}

// ─── Single panel ────────────────────────────────────────────────────────

export const SINGLE_PANEL_ID = 'solo-panel';

export interface SinglePanelOptions {
	title?: string;
	kind?: PanelKind;
	panelName?: string;
	/** Plugin config (legend, axes, formatting, thresholds, …) for the panel. */
	pluginSpec?: PanelPluginSpec;
	/** Replaces the kind's default query. */
	query?: Query;
	/** Context links attached to the panel. */
	links?: ContextLink[];
	/** Attaches the `VARIABLE_NAMES` variables, for interpolation cases. */
	withVariables?: boolean;
}

/**
 * One panel, one section. Fully configurable so specs never reach into the
 * returned object — post-hoc mutation is four levels deep and breaks silently
 * when the spec shape moves.
 */
export function singlePanelDashboard(
	options: SinglePanelOptions = {},
): PostableDashboard {
	return buildDashboard({
		title: options.title ?? `e2e-single-${Date.now()}-${uniqueSuffix()}`,
		...(options.withVariables ? { variables: VARIABLES } : {}),
		sections: [
			{
				title: 'Section',
				panels: {
					[SINGLE_PANEL_ID]: panel(options.kind ?? PanelKind.TimeSeries, {
						name: options.panelName ?? 'Solo panel',
						...(options.pluginSpec ? { pluginSpec: options.pluginSpec } : {}),
						...(options.query ? { query: options.query } : {}),
						...(options.links ? { links: options.links } : {}),
					}),
				},
			},
		],
	});
}

/** No panels at all — drives the dashboard empty state and its New Panel CTA. */
export function emptyDashboard(title?: string): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-empty-${Date.now()}-${uniqueSuffix()}`,
		sections: [],
	});
}

// ─── Query-type coverage ─────────────────────────────────────────────────

export const QUERY_TYPE_PANELS = {
	builder: 'qb-panel',
	promql: 'promql-panel',
	clickhouse: 'chsql-panel',
} as const;

/** One panel per query type, for the capability and drilldown-gating specs. */
export function queryTypesDashboard(title?: string): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-query-types-${Date.now()}-${uniqueSuffix()}`,
		sections: [
			{
				title: 'Query types',
				panels: {
					[QUERY_TYPE_PANELS.builder]: panel(PanelKind.TimeSeries, {
						name: 'Builder query',
					}),
					[QUERY_TYPE_PANELS.promql]: panel(PanelKind.TimeSeries, {
						name: 'PromQL query',
						query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
					}),
					[QUERY_TYPE_PANELS.clickhouse]: panel(PanelKind.Table, {
						name: 'ClickHouse query',
						query: clickhouseQuery(
							"SELECT now() AS ts, 'adservice' AS service, 1 AS A",
						),
					}),
				},
			},
		],
	});
}

// ─── Variables ───────────────────────────────────────────────────────────

export const VARIABLE_NAMES = {
	custom: 'serviceCustom',
	dynamic: 'serviceDynamic',
} as const;

const VARIABLES: Variable[] = [
	{
		kind: 'ListVariable',
		spec: {
			name: VARIABLE_NAMES.custom,
			display: { name: VARIABLE_NAMES.custom },
			allowAllValue: false,
			allowMultiple: false,
			sort: 'none',
			plugin: {
				kind: 'signoz/CustomVariable',
				// Closed list: resolves instantly, no backend round-trip.
				spec: { customValue: GOLDEN.services.slice(0, 3).join(',') },
			},
		},
	},
	{
		kind: 'ListVariable',
		spec: {
			name: VARIABLE_NAMES.dynamic,
			display: { name: VARIABLE_NAMES.dynamic },
			allowAllValue: true,
			allowMultiple: true,
			sort: 'alphabetical-asc',
			plugin: {
				kind: 'signoz/DynamicVariable',
				spec: { name: 'service.name', signal: 'metrics' },
			},
		},
	},
];

export const VARIABLE_PANEL_ID = 'var-panel';

/** A panel filtered by a dashboard variable — backs the drilldown variable cases. */
export function variablesDashboard(
	title?: string,
	query?: Query,
): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-variables-${Date.now()}-${uniqueSuffix()}`,
		variables: VARIABLES,
		sections: [
			{
				title: 'Variables',
				panels: {
					[VARIABLE_PANEL_ID]: panel(PanelKind.TimeSeries, {
						name: 'Calls for $serviceCustom',
						query:
							query ??
							metricsQuery({
								filter: `service.name = $${VARIABLE_NAMES.custom}`,
							}),
					}),
				},
			},
		],
	});
}

// ─── Area / Heatmap / Text ───────────────────────────────────────────────

export const NEW_KINDS_PANELS = {
	area: 'area-panel',
	heatmap: 'heatmap-panel',
	text: 'md-panel',
} as const;

export const NEW_KINDS_MARKDOWN =
	'## Runbook\n\nCheck the **checkout** path first.';

/**
 * One Area, one Heatmap and one Text panel — the kinds added after the
 * all-kinds fixture, kept apart so its seven queries don't grow.
 */
export function newKindsDashboard(title?: string): PostableDashboard {
	return buildDashboard({
		title: title ?? `e2e-new-kinds-${Date.now()}-${uniqueSuffix()}`,
		sections: [
			{
				title: 'New kinds',
				panels: {
					[NEW_KINDS_PANELS.area]: panel(PanelKind.AreaChart, {
						name: 'Calls area',
					}),
					[NEW_KINDS_PANELS.heatmap]: panel(PanelKind.Heatmap, {
						name: 'Calls heatmap',
						query: heatmapQuery(),
					}),
					[NEW_KINDS_PANELS.text]: panel(PanelKind.Text, {
						name: 'Runbook',
						pluginSpec: { text: NEW_KINDS_MARKDOWN },
					}),
				},
			},
		],
	});
}

/** Invalid on purpose: Text must carry `queries: []`; the server rejects this. */
export function textPanelWithQueryDashboard(): PostableDashboard {
	const text = panel(PanelKind.Text, { name: 'Notes' });
	return buildDashboard({
		title: `e2e-text-with-query-${Date.now()}-${uniqueSuffix()}`,
		sections: [
			{
				title: 'Section',
				panels: {
					[SINGLE_PANEL_ID]: {
						...text,
						spec: { ...text.spec, queries: [metricsQuery()] },
					},
				},
			},
		],
	});
}
