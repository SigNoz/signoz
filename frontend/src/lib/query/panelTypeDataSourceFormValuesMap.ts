/**
 * Builder fields carried across a panel-type switch, per panel type and data source.
 *
 * The 24 combinations reduce to a handful of rules, so they are composed rather than
 * spelled out: logs and traces carry the same fields in every case, metrics splits its
 * aggregation in two, and each panel type is one of four query shapes. Order is
 * irrelevant — `handleQueryChange` copies each field independently.
 */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export type PartialPanelTypes = {
	[PANEL_TYPES.BAR]: 'bar';
	[PANEL_TYPES.LIST]: 'list';
	[PANEL_TYPES.TABLE]: 'table';
	[PANEL_TYPES.TIME_SERIES]: 'graph';
	[PANEL_TYPES.AREA]: 'area';
	[PANEL_TYPES.VALUE]: 'value';
	[PANEL_TYPES.PIE]: 'pie';
	[PANEL_TYPES.HISTOGRAM]: 'histogram';
};

export type BuilderField = keyof IBuilderQuery;

export type PanelTypeFormValues = {
	builder: { queryData: BuilderField[] };
};

/**
 * Every field a builder query has. Exhaustive by construction: a field added to
 * `IBuilderQuery` fails to compile here until it is listed, and the shapes below
 * are cut from this list by omission, so the new field has to be excluded on
 * purpose rather than forgotten into nothing.
 */
const ALL_FIELDS = {
	queryName: true,
	dataSource: true,
	aggregateOperator: true,
	aggregateAttribute: true,
	aggregations: true,
	timeAggregation: true,
	spaceAggregation: true,
	temporality: true,
	functions: true,
	filter: true,
	filters: true,
	groupBy: true,
	expression: true,
	disabled: true,
	having: true,
	limit: true,
	stepInterval: true,
	orderBy: true,
	reduceTo: true,
	legend: true,
	pageSize: true,
	offset: true,
	selectColumns: true,
	source: true,
	builderQueryType: true,
} satisfies Record<BuilderField, true>;

const EVERY_FIELD = Object.keys(ALL_FIELDS) as BuilderField[];

function omit(
	fields: readonly BuilderField[],
	...omitted: BuilderField[]
): BuilderField[] {
	return fields.filter((field) => !omitted.includes(field));
}

/** Metrics aggregates over time and then over space, so it carries both steps. */
const METRICS_AGGREGATION: readonly BuilderField[] = [
	'timeAggregation',
	'spaceAggregation',
];

/**
 * Carried by no shape: the provider appends `dataSource` itself, and the rest drive
 * surfaces the panel-type switch does not reach — list paging, the meter source, the
 * trace-operator discriminator.
 */
const NEVER_CARRIED: readonly BuilderField[] = [
	'dataSource',
	'temporality',
	'pageSize',
	'offset',
	'selectColumns',
	'source',
	'builderQueryType',
];

/** Carried only where the shape asks for them, below. */
const SHAPE_SPECIFIC: readonly BuilderField[] = [
	...METRICS_AGGREGATION,
	'reduceTo',
];

/** Charts carry every aggregating field — shared with table and pie. */
const SERIES: readonly BuilderField[] = omit(
	EVERY_FIELD,
	...NEVER_CARRIED,
	...SHAPE_SPECIFIC,
);
const SERIES_METRICS: readonly BuilderField[] = [
	...SERIES,
	...METRICS_AGGREGATION,
];

// Table and pie reduce each series to a single cell/slice. Note the asymmetry, carried
// over from the previous table: `reduceTo` is offered for metrics only.
const SCALAR_METRICS: readonly BuilderField[] = [...SERIES_METRICS, 'reduceTo'];

/** A single value has no series to group, limit or order. */
const SINGLE_VALUE: readonly BuilderField[] = [
	...omit(SERIES, 'groupBy', 'limit', 'orderBy'),
	'reduceTo',
];
const SINGLE_VALUE_METRICS: readonly BuilderField[] = [
	...SINGLE_VALUE,
	...METRICS_AGGREGATION,
];

/** Raw rows carry no aggregation at all. */
const RAW_ROWS: readonly BuilderField[] = omit(
	SERIES,
	'aggregateAttribute',
	'aggregateOperator',
	'groupBy',
	'having',
	'stepInterval',
	'disabled',
	'legend',
	'expression',
);
// Metrics rows drop paging and ordering too, as before.
const RAW_ROWS_METRICS: readonly BuilderField[] = omit(
	RAW_ROWS,
	'limit',
	'orderBy',
	'functions',
);

/**
 * Logs and traces share a builder surface; metrics is the one that differs.
 *
 * Each cell gets its own copy. `QueryBuilder`'s provider pushes onto the list it reads
 * from this map, so cells sharing one array instance would contaminate each other.
 */
function bySource(
	logsAndTraces: readonly BuilderField[],
	metrics: readonly BuilderField[],
): Record<DataSource, PanelTypeFormValues> {
	return {
		[DataSource.LOGS]: { builder: { queryData: [...logsAndTraces] } },
		[DataSource.TRACES]: { builder: { queryData: [...logsAndTraces] } },
		[DataSource.METRICS]: { builder: { queryData: [...metrics] } },
	};
}

export const panelTypeDataSourceFormValuesMap: Record<
	keyof PartialPanelTypes,
	Record<DataSource, PanelTypeFormValues>
> = {
	[PANEL_TYPES.TIME_SERIES]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.AREA]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.BAR]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.HISTOGRAM]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.TABLE]: bySource(SERIES, SCALAR_METRICS),
	[PANEL_TYPES.PIE]: bySource(SERIES, SCALAR_METRICS),
	[PANEL_TYPES.VALUE]: bySource(SINGLE_VALUE, SINGLE_VALUE_METRICS),
	[PANEL_TYPES.LIST]: bySource(RAW_ROWS, RAW_ROWS_METRICS),
};
