import {
	GOLDEN,
	PanelKind,
	clickhouseQuery,
	buildDashboard,
	metricsQuery,
	panel,
	promqlQuery,
	rawQuery,
} from '../../helpers/dashboard-spec';
import type {
	ContextLink,
	PanelPluginSpec,
	PostableDashboard,
	Query,
	Variable,
} from '../../helpers/dashboard-spec.types';

// Dashboard fixtures for the dashboard suites. TypeScript rather than frozen JSON so
// a contract change is a compile error, and panel ids stay visible to the specs
// that use them as test handles.
let seq = 0;
function uniqueSuffix(): string {
	seq += 1;
	return `${process.pid}-${seq}`;
}

// ─── Compact (default multi-panel fixture) ───────────────────────────────

export const COMPACT_PANELS = {
	timeseries: 'ts-panel',
	table: 'table-panel',
	list: 'list-panel',
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
