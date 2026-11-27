import type {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import type { LogAggregation, TraceAggregation } from 'types/api/v5/queryRange';

import { isBucketPanelType } from './bucketPanelTypes';

import {
	ALIAS,
	DISTRIBUTION_FIELD,
	parseAggregations,
	unquoteAlias,
} from './aggregationExpression';

// A numeric one-argument call such as `p99(duration_nano) as lat`; group 1 is the
// field, group 2 the inline alias. Other functions (`count_distinct`, `countIf`)
// take text or a condition.
const NUMERIC_FIELD_CALL = new RegExp(
	`^\\s*(?:avg|sum|min|max|p\\d{2})\\(\\s*([^\\s(),]+)\\s*\\)(?:\\s+as\\s+(${ALIAS}))?\\s*$`,
);

/** The percentile a field or histogram metric gets when it leaves a heatmap or distribution. */
export const DEFAULT_PERCENTILE = 'p90';

type FieldAggregation = TraceAggregation | LogAggregation;

const fieldAggregations = (query: IBuilderQuery): FieldAggregation[] =>
	(query.aggregations ?? []).filter(
		(aggregation): aggregation is FieldAggregation => 'expression' in aggregation,
	);

function isLogsOrTraces(
	dataSource: DataSource,
): dataSource is DataSource.LOGS | DataSource.TRACES {
	return dataSource === DataSource.LOGS || dataSource === DataSource.TRACES;
}

/** Whether the query's aggregation is a field rather than a function call. */
export function aggregatesDistributionField(
	panelType: string | null | undefined,
	dataSource: DataSource,
): boolean {
	return isBucketPanelType(panelType) && isLogsOrTraces(dataSource);
}

/**
 * Replaces every aggregation with `to`. Order-by names an aggregation by its alias
 * when it has one, else its expression: the order on `from` moves to `to`, or is
 * dropped when `to` is empty, and orders on `removedKeys` go.
 */
function replaceAggregation(
	query: IBuilderQuery,
	from: Partial<FieldAggregation> | undefined,
	to: string,
	removedKeys: string[] = [],
): IBuilderQuery {
	const fromKey = from?.alias || from?.expression;
	const isFrom = (order: OrderByPayload): boolean =>
		Boolean(fromKey) && order.columnName === fromKey;
	return {
		...query,
		aggregations: [{ expression: to }],
		orderBy: query.orderBy
			?.filter((order) =>
				isFrom(order) ? Boolean(to) : !removedKeys.includes(order.columnName),
			)
			.map((order) => (isFrom(order) ? { ...order, columnName: to } : order)),
	};
}

export function getDistributionFieldPlaceholder(
	dataSource: DataSource,
): string {
	return dataSource === DataSource.TRACES
		? 'Numeric field to bucket, e.g. duration_nano'
		: 'Numeric field to bucket';
}

/**
 * Logs and traces heatmaps and distributions bucket a field; any function aggregation is
 * rejected, so a numeric `fn(field)` keeps its field and anything else leaves
 * the field for the user to pick.
 */
export function toDistributionAggregation(query: IBuilderQuery): IBuilderQuery {
	if (!isLogsOrTraces(query.dataSource)) {
		return query;
	}
	const aggregations = fieldAggregations(query);
	const [first] = aggregations;
	const hasOneAggregation = aggregations.length === 1;
	if (hasOneAggregation && DISTRIBUTION_FIELD.test(first.expression ?? '')) {
		return query;
	}
	const fieldCall = hasOneAggregation
		? NUMERIC_FIELD_CALL.exec(first.expression ?? '')
		: null;
	const inlineAlias = fieldCall?.[2] && unquoteAlias(fieldCall[2]);
	const removedKeys = aggregations
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

/** Picks `field` as the aggregation; a sort on the old field follows it. */
export function setDistributionField(
	query: IBuilderQuery,
	field: string,
): IBuilderQuery {
	const [first] = fieldAggregations(query);
	return replaceAggregation(query, first, field);
}

/** Inverse of `toDistributionAggregation`: every other panel needs a function aggregation. */
export function fromDistributionAggregation(
	query: IBuilderQuery,
): IBuilderQuery {
	const aggregations = fieldAggregations(query);
	if (!isLogsOrTraces(query.dataSource) || aggregations.length !== 1) {
		return query;
	}
	const [first] = aggregations;
	const expression = first.expression?.trim() ?? '';
	const field = DISTRIBUTION_FIELD.exec(expression)?.[1];
	if (expression && !field) {
		return query;
	}
	return replaceAggregation(
		query,
		{ alias: first.alias, expression: field },
		field ? `${DEFAULT_PERCENTILE}(${field})` : 'count()',
	);
}
