/* eslint-disable sonarjs/cognitive-complexity */
import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import {
	DEPRECATED_OPERATORS_MAP,
	QUERY_BUILDER_FUNCTIONS,
} from 'constants/antlrQueryConstants';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { IQueryPair } from 'types/antlrQueryTypes';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	Having,
	IBuilderQuery,
	Query,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	LogAggregation,
	MetricAggregation,
	TraceAggregation,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { unquote } from 'utils/stringUtils';
import { isFunctionOperator, isNonValueOperator } from 'utils/tokenUtils';
import { v4 as uuid } from 'uuid';

/**
 * Check if an operator requires array values (like IN, NOT IN)
 * @param operator - The operator to check
 * @returns True if the operator requires array values
 */
const isArrayOperator = (operator: string): boolean => {
	const arrayOperators = ['in', 'not in', 'IN', 'NOT IN'];
	return arrayOperators.includes(operator);
};

const isVariable = (value: string | string[] | number | boolean): boolean => {
	if (Array.isArray(value)) {
		return value.some((v) => typeof v === 'string' && v.trim().startsWith('$'));
	}
	return typeof value === 'string' && value.trim().startsWith('$');
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
	if (isVariable(value)) {
		return String(value);
	}

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

			let operator = op.trim().toLowerCase();
			if (Object.keys(DEPRECATED_OPERATORS_MAP).includes(operator)) {
				operator =
					DEPRECATED_OPERATORS_MAP[
						operator as keyof typeof DEPRECATED_OPERATORS_MAP
					];
			}

			if (isNonValueOperator(operator)) {
				return `${key.key} ${operator}`;
			}

			if (isFunctionOperator(operator)) {
				// Get the proper function name from QUERY_BUILDER_FUNCTIONS
				const functionOperators = Object.values(QUERY_BUILDER_FUNCTIONS);
				const properFunctionName =
					functionOperators.find(
						(func: string) => func.toLowerCase() === operator.toLowerCase(),
					) || operator;

				const formattedValue = formatValueForExpression(value, operator);
				return `${properFunctionName}(${key.key}, ${formattedValue})`;
			}

			const formattedValue = formatValueForExpression(value, operator);
			return `${key.key} ${operator} ${formattedValue}`;
		})
		.filter((expression) => expression !== ''); // Remove empty expressions

	return {
		expression: expressions.join(' AND '),
	};
};

const formatValuesForFilter = (value: string | string[]): string | string[] => {
	if (Array.isArray(value)) {
		return value.map((v) => (typeof v === 'string' ? unquote(v) : String(v)));
	}
	if (typeof value === 'string') {
		return unquote(value);
	}
	return String(value);
};

export const convertExpressionToFilters = (
	expression: string,
): TagFilterItem[] => {
	if (!expression) return [];

	const queryPairs = extractQueryPairs(expression);
	const filters: TagFilterItem[] = [];

	queryPairs.forEach((pair) => {
		const operator = pair.hasNegation
			? getOperatorValue(`NOT_${pair.operator}`.toUpperCase())
			: getOperatorValue(pair.operator.toUpperCase());
		filters.push({
			id: uuid(),
			op: operator,
			key: {
				id: pair.key,
				key: pair.key,
				type: '',
			},
			value: pair.isMultiValue
				? formatValuesForFilter(pair.valueList as string[]) ?? []
				: formatValuesForFilter(pair.value as string) ?? '',
		});
	});

	return filters;
};

/**
 * Removes specified key-value pairs from a logical query expression string.
 *
 * This function parses the given query expression and removes any query pairs
 * whose keys match those in the `keysToRemove` array. It also removes any trailing
 * logical conjunctions (e.g., `AND`, `OR`) and whitespace that follow the matched pairs,
 * ensuring that the resulting expression remains valid and clean.
 *
 * @param expression - The full query string.
 * @param keysToRemove - An array of keys (case-insensitive) that should be removed from the expression.
 * @param removeOnlyVariableExpressions - When true, only removes key-value pairs where the value is a variable (starts with $). When false, uses the original behavior.
 * @returns A new expression string with the specified keys and their associated clauses removed.
 */
export const removeKeysFromExpression = (
	expression: string,
	keysToRemove: string[],
	removeOnlyVariableExpressions = false,
): string => {
	if (!keysToRemove || keysToRemove.length === 0) {
		return expression;
	}

	let updatedExpression = expression;

	if (updatedExpression) {
		keysToRemove.forEach((key) => {
			// Extract key-value query pairs from the expression
			const existingQueryPairs = extractQueryPairs(updatedExpression);

			let queryPairsMap: Map<string, IQueryPair>;

			if (existingQueryPairs.length > 0) {
				// Filter query pairs based on the removeOnlyVariableExpressions flag
				const filteredQueryPairs = removeOnlyVariableExpressions
					? existingQueryPairs.filter((pair) => {
							const pairKey = pair.key?.trim().toLowerCase();
							const matchesKey = pairKey === `${key}`.trim().toLowerCase();
							if (!matchesKey) return false;
							const value = pair.value?.toString().trim();
							return value && value.includes('$');
					  })
					: existingQueryPairs;

				// Build a map for quick lookup of query pairs by their lowercase trimmed keys
				queryPairsMap = new Map(
					filteredQueryPairs.map((pair) => {
						const key = pair.key.trim().toLowerCase();
						return [key, pair];
					}),
				);

				// Lookup the current query pair using the attribute key (case-insensitive)
				const currentQueryPair = queryPairsMap.get(`${key}`.trim().toLowerCase());
				if (currentQueryPair && currentQueryPair.isComplete) {
					// Determine the start index of the query pair (fallback order: key → operator → value)
					const queryPairStart =
						currentQueryPair.position.keyStart ??
						currentQueryPair.position.operatorStart ??
						currentQueryPair.position.valueStart;
					// Determine the end index of the query pair (fallback order: value → operator → key)
					let queryPairEnd =
						currentQueryPair.position.valueEnd ??
						currentQueryPair.position.operatorEnd ??
						currentQueryPair.position.keyEnd;
					// Get the part of the expression that comes after the current query pair
					const expressionAfterPair = `${updatedExpression.slice(queryPairEnd + 1)}`;
					// Match optional spaces and an optional conjunction (AND/OR), case-insensitive
					const conjunctionOrSpacesRegex = /^(\s*((AND|OR)\s+)?)/i;
					const match = expressionAfterPair.match(conjunctionOrSpacesRegex);
					if (match && match.length > 0) {
						// If match is found, extend the queryPairEnd to include the matched part
						queryPairEnd += match[0].length;
					}
					// Remove the full query pair (including any conjunction/whitespace) from the expression
					updatedExpression = `${updatedExpression.slice(
						0,
						queryPairStart,
					)}${updatedExpression.slice(queryPairEnd + 1)}`.trim();
				}
			}
		});

		// Clean up any remaining trailing AND/OR operators and extra whitespace
		updatedExpression = updatedExpression
			.replace(/\s+(AND|OR)\s*$/i, '') // Remove trailing AND/OR
			.replace(/^(AND|OR)\s+/i, '') // Remove leading AND/OR
			.trim();
	}

	return updatedExpression;
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
export const convertAggregationToExpression = ({
	aggregateOperator,
	aggregateAttribute,
	dataSource,
	timeAggregation,
	spaceAggregation,
	alias,
	reduceTo,
	temporality,
}: {
	aggregateOperator: string;
	aggregateAttribute: BaseAutocompleteData;
	dataSource: DataSource;
	timeAggregation?: string;
	spaceAggregation?: string;
	alias?: string;
	reduceTo?: ReduceOperators;
	temporality?: string;
}): (TraceAggregation | LogAggregation | MetricAggregation)[] | undefined => {
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
				metricName: aggregateAttribute?.key || '',
				reduceTo,
				temporality,
				timeAggregation: (normalizedTimeAggregation || normalizedOperator) as any,
				spaceAggregation: (normalizedSpaceAggregation || normalizedOperator) as any,
			} as MetricAggregation,
		];
	}

	// For traces and logs, use expression format
	const expression = aggregateAttribute?.key
		? `${normalizedOperator}(${aggregateAttribute?.key})`
		: `${normalizedOperator}()`;

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

function getColId(
	queryName: string,
	aggregation: { alias?: string; expression?: string },
	isMultipleAggregations: boolean,
): string {
	if (isMultipleAggregations && aggregation.expression) {
		return `${queryName}.${aggregation.expression}`;
	}

	return queryName;
}

// function to give you label value for query name taking multiaggregation into account
export function getQueryLabelWithAggregation(
	queryData: IBuilderQuery[],
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
		const isMultipleAggregations = aggregations.length > 1;

		aggregations.forEach((agg: any, index: number) => {
			const columnId = getColId(queryName, agg, isMultipleAggregations);

			// For display purposes, show the aggregation index for multiple aggregations
			const displayLabel = isMultipleAggregations
				? `${queryName}.${index}`
				: queryName;

			labels.push({
				label: displayLabel,
				value: columnId, // This matches the ID format used in table columns
			});
		});
	});

	return labels;
}

export const adjustQueryForV5 = (currentQuery: Query): Query => {
	if (currentQuery.queryType === EQueryType.QUERY_BUILDER) {
		const newQueryData = currentQuery.builder.queryData.map((query) => {
			const aggregations = query.aggregations?.map((aggregation) => {
				if (query.dataSource === DataSource.METRICS) {
					const metricAggregation = aggregation as MetricAggregation;
					return {
						...aggregation,
						metricName:
							metricAggregation.metricName || query.aggregateAttribute?.key || '',
						timeAggregation:
							metricAggregation.timeAggregation || query.timeAggregation || '',
						spaceAggregation:
							metricAggregation.spaceAggregation || query.spaceAggregation || '',
						reduceTo: metricAggregation.reduceTo || query.reduceTo || 'avg',
					};
				}
				return aggregation;
			});

			const {
				aggregateAttribute,
				aggregateOperator,
				timeAggregation,
				spaceAggregation,
				reduceTo,
				filters,
				...retainedQuery
			} = query;

			const newAggregations =
				query.dataSource === DataSource.METRICS
					? (aggregations as MetricAggregation[])
					: (aggregations as (TraceAggregation | LogAggregation)[]);

			return {
				...retainedQuery,
				aggregations: newAggregations,
			};
		});

		return {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: newQueryData,
			},
		};
	}

	return currentQuery;
};
