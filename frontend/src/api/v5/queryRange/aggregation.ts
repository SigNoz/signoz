import { PANEL_TYPES } from 'constants/queryBuilder';
import { isEmpty } from 'lodash-es';
import {
	LogAggregation,
	MetricAggregation,
	TraceAggregation,
} from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

export function parseAggregations(
	expression: string,
	availableAlias?: string,
): { expression: string; alias?: string }[] {
	const result: { expression: string; alias?: string }[] = [];
	const regex = /([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+((?:'[^']*'|"[^"]*"|[a-zA-Z0-9_-]+)))?/g;
	let match = regex.exec(expression);
	while (match !== null) {
		const expr = match[1];
		let alias = match[2] || availableAlias;
		if (alias) {
			alias = alias.replace(/^['"]|['"]$/g, '');
			result.push({ expression: expr, alias });
		} else {
			result.push({ expression: expr });
		}
		match = regex.exec(expression);
	}
	return result;
}

export function createAggregation(
	queryData: any,
	panelType?: PANEL_TYPES,
): TraceAggregation[] | LogAggregation[] | MetricAggregation[] {
	if (!queryData) {
		return [];
	}

	const haveReduceTo =
		queryData.dataSource === DataSource.METRICS &&
		panelType &&
		(panelType === PANEL_TYPES.TABLE ||
			panelType === PANEL_TYPES.PIE ||
			panelType === PANEL_TYPES.VALUE);

	if (queryData.dataSource === DataSource.METRICS) {
		return [
			{
				metricName:
					queryData?.aggregations?.[0]?.metricName ||
					queryData?.aggregateAttribute?.key,
				temporality:
					queryData?.aggregations?.[0]?.temporality ||
					queryData?.aggregateAttribute?.temporality,
				timeAggregation:
					queryData?.aggregations?.[0]?.timeAggregation ||
					queryData?.timeAggregation,
				spaceAggregation:
					queryData?.aggregations?.[0]?.spaceAggregation ||
					queryData?.spaceAggregation,
				reduceTo: haveReduceTo
					? queryData?.aggregations?.[0]?.reduceTo || queryData?.reduceTo
					: undefined,
			},
		];
	}

	if (queryData.aggregations?.length > 0) {
		return queryData.aggregations.flatMap(
			(agg: { expression: string; alias?: string }) => {
				const parsedAggregations = parseAggregations(agg.expression, agg?.alias);
				return isEmpty(parsedAggregations)
					? [{ expression: 'count()' }]
					: parsedAggregations;
			},
		);
	}

	return [{ expression: 'count()' }];
}
