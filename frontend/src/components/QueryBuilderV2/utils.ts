import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	Having,
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	LogAggregation,
	MetricAggregation,
	TraceAggregation,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

/**
 * Check if an operator requires array values (like IN, NOT IN)
 * @param operator - The operator to check
 * @returns True if the operator requires array values
 */
const isArrayOperator = (operator: string): boolean => {
	const arrayOperators = ['in', 'nin', 'IN', 'NOT IN'];
	return arrayOperators.includes(operator);
};

/**
 * Format a value for the expression string
 * @param value - The value to format
 * @param operator - The operator being used (to determine if array is needed)
 * @returns Formatted value string
 */
const formatValueForExpression = (
	value: string[] | string | number | boolean,
	operator?: string,
): string => {
	// For IN operators, ensure value is always an array
	if (isArrayOperator(operator || '')) {
		const arrayValue = Array.isArray(value) ? value : [value];
		return `[${arrayValue
			.map((v) =>
				typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v),
			)
			.join(', ')}]`;
	}

	if (Array.isArray(value)) {
		// Handle array values (e.g., for IN operations)
		return `[${value
			.map((v) =>
				typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v),
			)
			.join(', ')}]`;
	}

	if (typeof value === 'string') {
		// Add single quotes around all string values and escape internal single quotes
		return `'${value.replace(/'/g, "\\'")}'`;
	}

	return String(value);
};

export const convertFiltersToExpression = (
	filters: TagFilter,
): { expression: string } => {
	if (!filters?.items || filters.items.length === 0) {
		return { expression: '' };
	}

	const expressions = filters.items
		.map((filter) => {
			const { key, op, value } = filter;

			// Skip if key is not defined
			if (!key?.key) {
				return '';
			}

			const formattedValue = formatValueForExpression(value, op);
			return `${key.key} ${op} ${formattedValue}`;
		})
		.filter((expression) => expression !== ''); // Remove empty expressions

	return {
		expression: expressions.join(' AND '),
	};
};

/**
 * Convert old having format to new having format
 * @param having - Array of old having objects with columnName, op, and value
 * @returns New having format with expression string
 */
export const convertHavingToExpression = (
	having: Having[],
): { expression: string } => {
	if (!having || having.length === 0) {
		return { expression: '' };
	}

	const expressions = having
		.map((havingItem) => {
			const { columnName, op, value } = havingItem;

			// Skip if columnName is not defined
			if (!columnName) {
				return '';
			}

			// Format value based on its type
			let formattedValue: string;
			if (Array.isArray(value)) {
				// For array values, format as [val1, val2, ...]
				formattedValue = `[${value.join(', ')}]`;
			} else {
				// For single values, just convert to string
				formattedValue = String(value);
			}

			return `${columnName} ${op} ${formattedValue}`;
		})
		.filter((expression) => expression !== ''); // Remove empty expressions

	return {
		expression: expressions.join(' AND '),
	};
};

/**
 * Convert old aggregation format to new aggregation format
 * @param aggregateOperator - The aggregate operator (e.g., 'sum', 'count', 'avg')
 * @param aggregateAttribute - The attribute to aggregate
 * @param dataSource - The data source type
 * @param timeAggregation - Time aggregation for metrics (optional)
 * @param spaceAggregation - Space aggregation for metrics (optional)
 * @param alias - Optional alias for the aggregation
 * @returns New aggregation format based on data source
 *
 */
export const convertAggregationToExpression = (
	aggregateOperator: string,
	aggregateAttribute: BaseAutocompleteData,
	dataSource: DataSource,
	timeAggregation?: string,
	spaceAggregation?: string,
	alias?: string,
): (TraceAggregation | LogAggregation | MetricAggregation)[] | undefined => {
	// Skip if no operator or attribute key
	if (!aggregateOperator) {
		return undefined;
	}

	// Replace noop with count as default
	const normalizedOperator =
		aggregateOperator === 'noop' ? 'count' : aggregateOperator;
	const normalizedTimeAggregation =
		timeAggregation === 'noop' ? 'count' : timeAggregation;
	const normalizedSpaceAggregation =
		spaceAggregation === 'noop' ? 'count' : spaceAggregation;

	// For metrics, use the MetricAggregation format
	if (dataSource === DataSource.METRICS) {
		return [
			{
				metricName: aggregateAttribute.key,
				timeAggregation: (normalizedTimeAggregation || normalizedOperator) as any,
				spaceAggregation: (normalizedSpaceAggregation || normalizedOperator) as any,
			} as MetricAggregation,
		];
	}

	// For traces and logs, use expression format
	const expression = `${normalizedOperator}(${aggregateAttribute.key})`;

	if (dataSource === DataSource.TRACES) {
		return [
			{
				expression,
				...(alias && { alias }),
			} as TraceAggregation,
		];
	}

	// For logs
	return [
		{
			expression,
			...(alias && { alias }),
		} as LogAggregation,
	];
};

export const getQueryTitles = (currentQuery: Query): string[] => {
	if (currentQuery.queryType === EQueryType.QUERY_BUILDER) {
		const queryTitles: string[] = [];

		// Handle builder queries with multiple aggregations
		currentQuery.builder.queryData.forEach((q) => {
			const aggregationCount = q.aggregations?.length || 1;

			if (aggregationCount > 1) {
				// If multiple aggregations, create titles like A.0, A.1, A.2
				for (let i = 0; i < aggregationCount; i++) {
					queryTitles.push(`${q.queryName}.${i}`);
				}
			} else {
				// Single aggregation, just use query name
				queryTitles.push(q.queryName);
			}
		});

		// Handle formulas (they don't have aggregations, so just use query name)
		const formulas = currentQuery.builder.queryFormulas.map((q) => q.queryName);

		return [...queryTitles, ...formulas];
	}

	if (currentQuery.queryType === EQueryType.CLICKHOUSE) {
		return currentQuery.clickhouse_sql.map((q) => q.name);
	}

	return currentQuery.promql.map((q) => q.name);
};

// function to give you label value for query name taking multiaggregation into account
export function getQueryLabelWithAggregation(
	queryData: IBuilderQuery[],
	legendMap: Record<string, string> = {},
): { label: string; value: string }[] {
	const labels: { label: string; value: string }[] = [];

	const aggregationPerQuery =
		queryData.reduce((acc, query) => {
			if (query.queryName && query.aggregations?.length) {
				acc[query.queryName] = createAggregation(query).map((a: any) => ({
					alias: a.alias,
					expression: a.expression,
				}));
			}
			return acc;
		}, {} as Record<string, any>) || {};

	Object.entries(aggregationPerQuery).forEach(([queryName, aggregations]) => {
		const legend = legendMap[queryName];

		if (aggregations.length > 1) {
			aggregations.forEach((agg: any, index: number) => {
				const aggregationName = agg.alias || agg.expression || '';
				const label = `${queryName}.${index}`;
				const value = legend
					? `${aggregationName}-${legend}`
					: `${queryName}.${aggregationName}`;
				labels.push({
					label,
					value,
				});
			});
		} else if (aggregations.length === 1) {
			const label = legend || queryName;
			const value = legend || queryName;
			labels.push({
				label,
				value,
			});
		}
	});

	return labels;
}
