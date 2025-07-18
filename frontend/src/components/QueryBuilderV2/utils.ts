/* eslint-disable sonarjs/cognitive-complexity */
import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { OPERATORS } from 'constants/antlrQueryConstants';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { cloneDeep } from 'lodash-es';
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
import { DataSource } from 'types/common/queryBuilder';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { unquote } from 'utils/stringUtils';
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

const formatValuesForFilter = (value: string | string[]): string | string[] => {
	if (Array.isArray(value)) {
		return value.map((v) => (typeof v === 'string' ? unquote(v) : String(v)));
	}
	if (typeof value === 'string') {
		return unquote(value);
	}
	return String(value);
};

export const convertFiltersToExpressionWithExistingQuery = (
	filters: TagFilter,
	existingQuery: string | undefined,
): { filters: TagFilter; filter: { expression: string } } => {
	if (!existingQuery) {
		// If no existing query, return filters with a newly generated expression
		return {
			filters,
			filter: convertFiltersToExpression(filters),
		};
	}

	// Extract query pairs from the existing query
	const queryPairs = extractQueryPairs(existingQuery.trim());
	let queryPairsMap: Map<string, IQueryPair> = new Map();

	const updatedFilters = cloneDeep(filters); // Clone filters to avoid direct mutation
	const nonExistingFilters: TagFilterItem[] = [];
	let modifiedQuery = existingQuery; // We'll modify this query as we proceed
	const visitedPairs: Set<string> = new Set(); // Set to track visited query pairs

	// Map extracted query pairs to key-specific pair information for faster access
	if (queryPairs.length > 0) {
		queryPairsMap = new Map(
			queryPairs.map((pair) => {
				const key = pair.hasNegation
					? `${pair.key}-not ${pair.operator}`.trim().toLowerCase()
					: `${pair.key}-${pair.operator}`.trim().toLowerCase();
				return [key, pair];
			}),
		);
	}

	filters?.items?.forEach((filter) => {
		const { key, op, value } = filter;

		// Skip invalid filters with no key
		if (!key) return;

		let shouldAddToNonExisting = true; // Flag to decide if the filter should be added to non-existing filters
		const sanitizedOperator = op.trim().toUpperCase();

		// Check if the operator is IN or NOT IN
		if (
			[OPERATORS.IN, `${OPERATORS.NOT} ${OPERATORS.IN}`].includes(
				sanitizedOperator,
			)
		) {
			const existingPair = queryPairsMap.get(
				`${key.key}-${op}`.trim().toLowerCase(),
			);
			const formattedValue = formatValueForExpression(value, op);

			// If a matching query pair exists, modify the query
			if (
				existingPair &&
				existingPair.position?.valueStart &&
				existingPair.position?.valueEnd
			) {
				visitedPairs.add(`${key.key}-${op}`.trim().toLowerCase());
				modifiedQuery =
					modifiedQuery.slice(0, existingPair.position.valueStart) +
					formattedValue +
					modifiedQuery.slice(existingPair.position.valueEnd + 1);
				return;
			}

			// Handle the different cases for IN operator
			switch (sanitizedOperator) {
				case OPERATORS.IN:
					// If there's a NOT IN or equal operator, merge the filter
					if (
						queryPairsMap.has(
							`${key.key}-${OPERATORS.NOT} ${op}`.trim().toLowerCase(),
						)
					) {
						const notInPair = queryPairsMap.get(
							`${key.key}-${OPERATORS.NOT} ${op}`.trim().toLowerCase(),
						);
						visitedPairs.add(
							`${key.key}-${OPERATORS.NOT} ${op}`.trim().toLowerCase(),
						);
						if (notInPair?.position?.valueEnd) {
							modifiedQuery = `${modifiedQuery.slice(
								0,
								notInPair.position.negationStart,
							)}${OPERATORS.IN} ${formattedValue} ${modifiedQuery.slice(
								notInPair.position.valueEnd + 1,
							)}`;
						}
						shouldAddToNonExisting = false; // Don't add this to non-existing filters
					} else if (
						queryPairsMap.has(`${key.key}-${OPERATORS['=']}`.trim().toLowerCase())
					) {
						const equalsPair = queryPairsMap.get(
							`${key.key}-${OPERATORS['=']}`.trim().toLowerCase(),
						);
						visitedPairs.add(`${key.key}-${OPERATORS['=']}`.trim().toLowerCase());
						if (equalsPair?.position?.valueEnd) {
							modifiedQuery = `${modifiedQuery.slice(
								0,
								equalsPair.position.operatorStart,
							)}${OPERATORS.IN} ${formattedValue} ${modifiedQuery.slice(
								equalsPair.position.valueEnd + 1,
							)}`;
						}
						shouldAddToNonExisting = false; // Don't add this to non-existing filters
					} else if (
						queryPairsMap.has(`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase())
					) {
						const notEqualsPair = queryPairsMap.get(
							`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase(),
						);
						visitedPairs.add(`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase());
						if (notEqualsPair?.position?.valueEnd) {
							modifiedQuery = `${modifiedQuery.slice(
								0,
								notEqualsPair.position.operatorStart,
							)}${OPERATORS.IN} ${formattedValue} ${modifiedQuery.slice(
								notEqualsPair.position.valueEnd + 1,
							)}`;
						}
						shouldAddToNonExisting = false; // Don't add this to non-existing filters
					}
					break;
				case `${OPERATORS.NOT} ${OPERATORS.IN}`:
					if (
						queryPairsMap.has(`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase())
					) {
						const notEqualsPair = queryPairsMap.get(
							`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase(),
						);
						visitedPairs.add(`${key.key}-${OPERATORS['!=']}`.trim().toLowerCase());
						if (notEqualsPair?.position?.valueEnd) {
							modifiedQuery = `${modifiedQuery.slice(
								0,
								notEqualsPair.position.operatorStart,
							)}${OPERATORS.NOT} ${
								OPERATORS.IN
							} ${formattedValue} ${modifiedQuery.slice(
								notEqualsPair.position.valueEnd + 1,
							)}`;
						}
						shouldAddToNonExisting = false; // Don't add this to non-existing filters
					}
					break; // No operation needed for NOT IN case
				default:
					break;
			}
		}

		if (
			queryPairsMap.has(`${filter.key?.key}-${filter.op}`.trim().toLowerCase())
		) {
			visitedPairs.add(`${filter.key?.key}-${filter.op}`.trim().toLowerCase());
		}

		// Add filters that don't have an existing pair to non-existing filters
		if (
			shouldAddToNonExisting &&
			!queryPairsMap.has(`${filter.key?.key}-${filter.op}`.trim().toLowerCase())
		) {
			nonExistingFilters.push(filter);
		}
	});

	// Create new filters from non-visited query pairs
	const newFilterItems: TagFilterItem[] = [];
	queryPairsMap.forEach((pair, key) => {
		if (!visitedPairs.has(key)) {
			const operator = pair.hasNegation
				? getOperatorValue(`NOT_${pair.operator}`.toUpperCase())
				: getOperatorValue(pair.operator.toUpperCase());

			newFilterItems.push({
				id: uuid(),
				op: operator,
				key: {
					id: pair.key,
					key: pair.key,
					type: '',
				},
				value: pair.isMultiValue
					? formatValuesForFilter(pair.valueList as string[]) ?? ''
					: formatValuesForFilter(pair.value as string) ?? '',
			});
		}
	});

	// Merge new filter items with existing ones
	if (newFilterItems.length > 0 && updatedFilters?.items) {
		updatedFilters.items = [...updatedFilters.items, ...newFilterItems];
	}

	// If no non-existing filters, return the modified query directly
	if (nonExistingFilters.length === 0) {
		return {
			filters: updatedFilters,
			filter: { expression: modifiedQuery },
		};
	}

	// Convert non-existing filters to an expression and append to the modified query
	const nonExistingFilterExpression = convertFiltersToExpression({
		items: nonExistingFilters,
		op: filters.op || 'AND',
	});

	if (nonExistingFilterExpression.expression) {
		return {
			filters: updatedFilters,
			filter: {
				expression: `${modifiedQuery.trim()} ${
					nonExistingFilterExpression.expression
				}`,
			},
		};
	}

	// Return the final result with the modified query
	return {
		filters: updatedFilters,
		filter: { expression: modifiedQuery || '' },
	};
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
 * @returns A new expression string with the specified keys and their associated clauses removed.
 */
export const removeKeysFromExpression = (
	expression: string,
	keysToRemove: string[],
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
				// Build a map for quick lookup of query pairs by their lowercase trimmed keys
				queryPairsMap = new Map(
					existingQueryPairs.map((pair) => {
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

function getColId(
	queryName: string,
	aggregation: { alias?: string; expression?: string },
): string {
	return `${queryName}.${aggregation.expression}`;
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
			const columnId = getColId(queryName, agg);

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
