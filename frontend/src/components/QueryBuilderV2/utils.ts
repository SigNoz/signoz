import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Having, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import {
	LogAggregation,
	MetricAggregation,
	TraceAggregation,
} from 'types/api/v5/queryRange';
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
): (TraceAggregation | LogAggregation | MetricAggregation)[] => {
	// Skip if no operator or attribute key
	if (!aggregateOperator) {
		return [];
	}

	// For metrics, use the MetricAggregation format
	if (dataSource === DataSource.METRICS) {
		return [
			{
				metricName: aggregateAttribute.key,
				timeAggregation: (timeAggregation || aggregateOperator) as any,
				spaceAggregation: (spaceAggregation || aggregateOperator) as any,
			} as MetricAggregation,
		];
	}

	// For traces and logs, use expression format
	const expression = `${aggregateOperator}(${aggregateAttribute.key})`;

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
