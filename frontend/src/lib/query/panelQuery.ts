/**
 * Panel query shaping shared by the dashboard panel editor and the query
 * builder: the per-panel-type field allowlist, the panel-type switch, and the
 * dirty-check used to decide whether a panel has unsaved query edits.
 */
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { cloneDeep, isEqual, set, unset } from 'lodash-es';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

// Asks "would saving the current panel change the persisted widget spec?".
//
// `adjustQueryForV5` is deliberately not reused here: in addition to stripping
// the legacy v4 fields, it also resurrects them onto each metric
// `aggregations[i]`. That migration step is correct on save but bleeds
// asymmetrically across a comparator — the live query still carries the
// legacy defaults from `initialQueryBuilderFormValuesMap` while a previously
// saved widget had them stripped.
const stripQueryDataForCompare = (
	queryData: IBuilderQuery,
): Record<string, unknown> => {
	const {
		aggregateAttribute: _aggregateAttribute,
		aggregateOperator: _aggregateOperator,
		timeAggregation: _timeAggregation,
		spaceAggregation: _spaceAggregation,
		reduceTo: _reduceTo,
		filters: _filters,
		...retained
	} = queryData ?? ({} as IBuilderQuery);

	const groupBy = (retained.groupBy ?? []).map((entry) => {
		const { id: _id, ...rest } = entry;
		return rest;
	});

	return {
		...retained,
		groupBy,
		source: retained.source || '',
	};
};

const normalizeForDirtyCheck = (query: Query): Record<string, unknown> => {
	const { id: _id, unit, builder, ...rest } = query;
	return {
		...rest,
		// `id` is regenerated on every Stage and Run; `unit` flips between ''
		// and undefined depending on whether the user has touched the selector.
		unit: unit || '',
		builder: {
			...builder,
			queryData: (builder?.queryData ?? []).map(stripQueryDataForCompare),
		},
	};
};

// `lodash.isEqual` distinguishes `{a: undefined}` from `{}`; for the dirty
// check those are the same. Initial-values spreads on the live query
// frequently leave such explicit-undefined keys.
const stripUndefined = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(stripUndefined);
	}
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
			if (v === undefined) {
				return;
			}
			out[k] = stripUndefined(v);
		});
		return out;
	}
	return value;
};

export const getIsQueryModified = (
	currentQuery: Query,
	baselineQuery: Query | null | undefined,
): boolean => {
	if (!baselineQuery) {
		return false;
	}
	return !isEqual(
		stripUndefined(normalizeForDirtyCheck(baselineQuery)),
		stripUndefined(normalizeForDirtyCheck(currentQuery)),
	);
};

export type PartialPanelTypes = {
	[PANEL_TYPES.BAR]: 'bar';
	[PANEL_TYPES.LIST]: 'list';
	[PANEL_TYPES.TABLE]: 'table';
	[PANEL_TYPES.TIME_SERIES]: 'graph';
	[PANEL_TYPES.VALUE]: 'value';
	[PANEL_TYPES.PIE]: 'pie';
	[PANEL_TYPES.HISTOGRAM]: 'histogram';
};

/**
 * Builder fields carried across a panel-type switch, per panel type and data source.
 *
 * The 21 combinations reduce to a handful of rules, so they are composed rather than
 * spelled out: logs and traces carry the same fields in every case, metrics splits its
 * aggregation in two, and each panel type is one of four query shapes. Order is
 * irrelevant — `handleQueryChange` copies each field independently.
 *
 * `panelTypeFormValues` in `__tests__/__fixtures__` pins the previous literal table so
 * the composition can be shown to reproduce it exactly.
 */

/** Every field an aggregating query carries — shared by charts, table and pie. */
const AGGREGATING_FIELDS = [
	'aggregateAttribute',
	'aggregateOperator',
	'filters',
	'filter',
	'groupBy',
	'limit',
	'having',
	'orderBy',
	'functions',
	'stepInterval',
	'disabled',
	'queryName',
	'legend',
	'expression',
	'aggregations',
] as const;

/** Metrics aggregates over time and then over space, so it carries both steps. */
const METRICS_AGGREGATION = ['timeAggregation', 'spaceAggregation'] as const;

function omit(fields: readonly string[], ...omitted: string[]): string[] {
	return fields.filter((field) => !omitted.includes(field));
}

const SERIES = [...AGGREGATING_FIELDS];
const SERIES_METRICS = [...SERIES, ...METRICS_AGGREGATION];

// Table and pie reduce each series to a single cell/slice. Note the asymmetry, carried
// over from the previous table: `reduceTo` is offered for metrics only.
const SCALAR_METRICS = [...SERIES_METRICS, 'reduceTo'];

/** A single value has no series to group, limit or order. */
const SINGLE_VALUE = [
	...omit(AGGREGATING_FIELDS, 'groupBy', 'limit', 'orderBy'),
	'reduceTo',
];
const SINGLE_VALUE_METRICS = [...SINGLE_VALUE, ...METRICS_AGGREGATION];

/** Raw rows carry no aggregation at all. */
const RAW_ROWS = [
	'queryName',
	'filters',
	'filter',
	'limit',
	'orderBy',
	'functions',
	'aggregations',
];
// Metrics rows drop paging and ordering too, as before.
const RAW_ROWS_METRICS = ['queryName', 'filters', 'filter', 'aggregations'];

/**
 * Logs and traces share a builder surface; metrics is the one that differs.
 *
 * Each cell gets its own copy. `QueryBuilder`'s provider pushes onto the list it reads
 * from this map, so cells sharing one array instance would contaminate each other.
 */
function bySource(
	logsAndTraces: readonly string[],
	metrics: readonly string[],
): Record<DataSource, any> {
	return {
		[DataSource.LOGS]: { builder: { queryData: [...logsAndTraces] } },
		[DataSource.TRACES]: { builder: { queryData: [...logsAndTraces] } },
		[DataSource.METRICS]: { builder: { queryData: [...metrics] } },
	};
}

export const panelTypeDataSourceFormValuesMap: Record<
	keyof PartialPanelTypes,
	Record<DataSource, any>
> = {
	[PANEL_TYPES.TIME_SERIES]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.BAR]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.HISTOGRAM]: bySource(SERIES, SERIES_METRICS),
	[PANEL_TYPES.TABLE]: bySource(SERIES, SCALAR_METRICS),
	[PANEL_TYPES.PIE]: bySource(SERIES, SCALAR_METRICS),
	[PANEL_TYPES.VALUE]: bySource(SINGLE_VALUE, SINGLE_VALUE_METRICS),
	[PANEL_TYPES.LIST]: bySource(RAW_ROWS, RAW_ROWS_METRICS),
};

export function handleQueryChange(
	newPanelType: keyof PartialPanelTypes,
	supersetQuery: Query,
	currentPanelType: PANEL_TYPES,
): Query {
	return {
		...supersetQuery,
		builder: {
			...supersetQuery.builder,
			queryData: supersetQuery.builder.queryData.map((query, index) => {
				const { dataSource } = query;
				const tempQuery = cloneDeep(initialQueryBuilderFormValuesMap[dataSource]);

				const fieldsToSelect =
					panelTypeDataSourceFormValuesMap[newPanelType][dataSource].builder
						.queryData;

				fieldsToSelect.forEach((field: keyof IBuilderQuery) => {
					set(tempQuery, field, supersetQuery.builder.queryData[index][field]);
				});

				if (newPanelType === PANEL_TYPES.LIST) {
					set(tempQuery, 'aggregateOperator', 'noop');
					set(tempQuery, 'offset', 0);
					set(tempQuery, 'pageSize', 10);
					set(tempQuery, 'orderBy', undefined);
				} else if (tempQuery.aggregateOperator === 'noop') {
					// this condition takes care of the part where we start with the list panel type and then shift to other panels
					// because in other cases we never set list operator and other fields in superset query rather just update in the current / staged query
					set(tempQuery, 'aggregateOperator', 'count');
					unset(tempQuery, 'offset');
					unset(tempQuery, 'pageSize');
				}

				if (
					currentPanelType === PANEL_TYPES.LIST &&
					newPanelType !== PANEL_TYPES.LIST
				) {
					set(tempQuery, 'orderBy', undefined);
				}

				return tempQuery;
			}),
			queryTraceOperator:
				newPanelType === PANEL_TYPES.LIST
					? []
					: supersetQuery.builder.queryTraceOperator,
		},
	};
}
