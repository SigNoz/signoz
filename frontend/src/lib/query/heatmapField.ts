import { PANEL_TYPES } from 'constants/queryBuilder';
import type {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	ALIAS,
	BARE_FIELD,
	parseAggregations,
	unquoteAlias,
} from './aggregationExpression';

// A numeric one-argument call such as `p99(duration_nano) as lat`; group 1 is the
// field, group 2 the inline alias. Other functions (`count_distinct`, `countIf`)
// take text or a condition.
const NUMERIC_FIELD_CALL = new RegExp(
	`^\\s*(?:avg|sum|min|max|p\\d{2})\\(\\s*([^\\s(),]+)\\s*\\)(?:\\s+as\\s+(${ALIAS}))?\\s*$`,
);

/** The percentile a field or histogram metric gets when it leaves a heatmap. */
export const DEFAULT_PERCENTILE = 'p90';

type Aggregation = { expression?: string; alias?: string };

function isLogsOrTraces(
	dataSource: DataSource,
): dataSource is DataSource.LOGS | DataSource.TRACES {
	return dataSource === DataSource.LOGS || dataSource === DataSource.TRACES;
}

/** Whether the query's aggregation is a bare field rather than a function call. */
export function aggregatesBareField(
	panelType: string | null | undefined,
	dataSource: DataSource,
): boolean {
	return panelType === PANEL_TYPES.HEATMAP && isLogsOrTraces(dataSource);
}

/**
 * Replaces every aggregation with `to`. Order-by names an aggregation by its alias
 * when it has one, else its expression: the order on `from` moves to `to`, or is
 * dropped when `to` is empty, and orders on `removedKeys` go.
 */
function replaceAggregation(
	query: IBuilderQuery,
	from: Aggregation | undefined,
	to: string,
	removedKeys: string[] = [],
): IBuilderQuery {
	const fromKey = from?.alias || from?.expression;
	const isFrom = (order: OrderByPayload): boolean =>
		Boolean(fromKey) && order.columnName === fromKey;
	return {
		...query,
		aggregations: [{ expression: to }] as IBuilderQuery['aggregations'],
		orderBy: query.orderBy
			?.filter((order) =>
				isFrom(order) ? Boolean(to) : !removedKeys.includes(order.columnName),
			)
			.map((order) => (isFrom(order) ? { ...order, columnName: to } : order)),
	};
}

export function getHeatmapFieldPlaceholder(dataSource: DataSource): string {
	return dataSource === DataSource.TRACES
		? 'Numeric field to bucket, e.g. duration_nano'
		: 'Numeric field to bucket';
}

/**
 * Logs and traces heatmaps bucket a bare field; any function aggregation is
 * rejected, so a numeric `fn(field)` keeps its field and anything else leaves
 * the field for the user to pick.
 */
export function toHeatmapAggregation(query: IBuilderQuery): IBuilderQuery {
	if (!isLogsOrTraces(query.dataSource)) {
		return query;
	}
	const aggregations = query.aggregations as Aggregation[] | undefined;
	const [first] = aggregations ?? [];
	const hasOneAggregation = aggregations?.length === 1;
	if (hasOneAggregation && BARE_FIELD.test(first.expression ?? '')) {
		return query;
	}
	const fieldCall = hasOneAggregation
		? NUMERIC_FIELD_CALL.exec(first.expression ?? '')
		: null;
	const inlineAlias = fieldCall?.[2] && unquoteAlias(fieldCall[2]);
	const removedKeys = (aggregations ?? [])
		.flatMap(({ expression, alias }) =>
			parseAggregations(expression ?? '', alias),
		)
		.map(({ expression, alias }) => alias || expression);
	return replaceAggregation(
		query,
		{ ...first, alias: first?.alias || inlineAlias },
		fieldCall?.[1] ?? '',
		removedKeys,
	);
}

/** Picks `field` as the heatmap's aggregation; a sort on the old field follows it. */
export function setHeatmapField(
	query: IBuilderQuery,
	field: string,
): IBuilderQuery {
	const [first] = (query.aggregations as Aggregation[] | undefined) ?? [];
	return replaceAggregation(query, first, field);
}

/** Inverse of `toHeatmapAggregation`: every other panel needs a function aggregation. */
export function fromHeatmapAggregation(query: IBuilderQuery): IBuilderQuery {
	if (!isLogsOrTraces(query.dataSource) || query.aggregations?.length !== 1) {
		return query;
	}
	const [first] = query.aggregations as Aggregation[];
	const expression = first.expression?.trim() ?? '';
	const field = BARE_FIELD.exec(expression)?.[1];
	if (expression && !field) {
		return query;
	}
	return replaceAggregation(
		query,
		{ alias: first.alias, expression: field },
		field ? `${DEFAULT_PERCENTILE}(${field})` : 'count()',
	);
}
