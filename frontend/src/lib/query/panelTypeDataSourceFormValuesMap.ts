/**
 * Builder fields carried across a panel-type switch, per panel type and data source.
 * Each shape is cut from the widest one by omission.
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

/** A field added to `IBuilderQuery` fails to compile here until answered either way. */
const IS_CARRIED = {
	queryName: true,
	aggregateOperator: true,
	aggregateAttribute: true,
	aggregations: true,
	timeAggregation: true,
	spaceAggregation: true,
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
	// Identifies an AI query, so the panel keeps authoring in AI mode after the switch.
	builderQueryType: true,
	// `dataSource` is appended by the provider; the rest drive surfaces this switch
	// does not reach.
	dataSource: false,
	temporality: false,
	pageSize: false,
	offset: false,
	selectColumns: false,
	source: false,
} satisfies Record<BuilderField, boolean>;

function omit(
	fields: readonly BuilderField[],
	...omitted: BuilderField[]
): BuilderField[] {
	return fields.filter((field) => !omitted.includes(field));
}

const METRICS_AGGREGATION: readonly BuilderField[] = [
	'timeAggregation',
	'spaceAggregation',
];

const SCALAR_METRICS: readonly BuilderField[] = (
	Object.entries(IS_CARRIED) as [BuilderField, boolean][]
)
	.filter(([, carried]) => carried)
	.map(([field]) => field);

// `reduceTo` is offered for metrics only, an asymmetry carried over from the old table.
const SERIES_METRICS: readonly BuilderField[] = omit(
	SCALAR_METRICS,
	'reduceTo',
);

const SERIES: readonly BuilderField[] = omit(
	SERIES_METRICS,
	...METRICS_AGGREGATION,
);

const SINGLE_VALUE_METRICS: readonly BuilderField[] = omit(
	SCALAR_METRICS,
	'groupBy',
	'limit',
	'orderBy',
);
const SINGLE_VALUE: readonly BuilderField[] = omit(
	SINGLE_VALUE_METRICS,
	...METRICS_AGGREGATION,
);

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
const RAW_ROWS_METRICS: readonly BuilderField[] = omit(
	RAW_ROWS,
	'limit',
	'orderBy',
	'functions',
);

/** Each cell gets its own copy; a shared instance would let cells contaminate
 * each other. */
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
