/* eslint-disable sonarjs/cognitive-complexity */
import { CharStreams, CommonTokenStream, ParserRuleContext } from 'antlr4';
import { cloneDeep, isEqual, sortBy } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import {
	DEPRECATED_OPERATORS_MAP,
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
} from 'constants/antlrQueryConstants';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import FilterQueryLexer from 'parser/FilterQueryLexer';
import FilterQueryParser, {
	AndExpressionContext,
	ComparisonContext,
	InClauseContext,
	NotInClauseContext,
	OrExpressionContext,
	PrimaryContext,
	UnaryExpressionContext,
} from 'parser/FilterQueryParser';
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
import { isQuoted, unquote } from 'utils/stringUtils';
import { isFunctionOperator, isNonValueOperator } from 'utils/tokenUtils';

/**
 * Check if an operator requires array values (like IN, NOT IN)
 * @param operator - The operator to check
 * @returns True if the operator requires array values
 */
const isArrayOperator = (operator: string): boolean => {
	const arrayOperators = ['in', 'not in', 'IN', 'NOT IN'];
	return arrayOperators.includes(operator);
};

const isVariable = (
	value: (string | number | boolean)[] | string | number | boolean,
): boolean => {
	if (Array.isArray(value)) {
		return value.some((v) => typeof v === 'string' && v.trim().startsWith('$'));
	}
	return typeof value === 'string' && value.trim().startsWith('$');
};

/**
 * Formats a single value for use in expression strings.
 * Strings are quoted and escaped, while numbers and booleans are converted to strings.
 */
const formatSingleValue = (v: string | number | boolean): string => {
	if (typeof v === 'string') {
		// Preserve already-quoted strings
		if (isQuoted(v)) {
			return v;
		}
		// Quote and escape single quotes in strings
		return `'${v.replace(/'/g, "\\'")}'`;
	}
	// Convert numbers and booleans to strings without quotes
	return String(v);
};

/**
 * Format a value for the expression string
 * @param value - The value to format
 * @param operator - The operator being used (to determine if array is needed)
 * @returns Formatted value string
 */
export const formatValueForExpression = (
	value: (string | number | boolean)[] | string | number | boolean,
	operator?: string,
): string => {
	if (isVariable(value)) {
		return String(value);
	}

	if (isArrayOperator(operator || '')) {
		const arrayValue = Array.isArray(value) ? value : [value];
		return `[${arrayValue.map(formatSingleValue).join(', ')}]`;
	}

	if (Array.isArray(value)) {
		return `[${value.map(formatSingleValue).join(', ')}]`;
	}

	if (typeof value === 'string') {
		return formatSingleValue(value);
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

/**
 * Converts a string value to its appropriate type (number, boolean, or string)
 * for use in filter objects. This is the inverse of formatSingleValue.
 */
function formatSingleValueForFilter(
	value: string | number | boolean,
): string | number | boolean {
	if (typeof value === 'string') {
		const trimmed = value.trim();

		// Try to convert numeric strings to numbers
		if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
			return Number(trimmed);
		}

		// Convert boolean strings to booleans
		if (trimmed === 'true' || trimmed === 'false') {
			return trimmed === 'true';
		}

		if (isQuoted(value)) {
			return unquote(value);
		}
	}

	// Return non-string values as-is, or string values that couldn't be converted
	return value;
}

/**
 * Formats values for filter objects, converting string representations
 * to their proper types (numbers, booleans) when appropriate.
 */
const formatValuesForFilter = (
	value: (string | number | boolean)[] | number | boolean | string,
): (string | number | boolean)[] | number | boolean | string => {
	if (Array.isArray(value)) {
		return value.map(formatSingleValueForFilter);
	}

	return formatSingleValueForFilter(value);
};

export const convertExpressionToFilters = (
	expression: string,
): TagFilterItem[] => {
	if (!expression) {
		return [];
	}

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
				? (formatValuesForFilter(pair.valueList as string[]) ?? [])
				: (formatValuesForFilter(pair.value as string) ?? ''),
		});
	});

	return filters;
};
const getQueryPairsMap = (query: string): Map<string, IQueryPair> => {
	const queryPairs = extractQueryPairs(query);
	const queryPairsMap: Map<string, IQueryPair> = new Map();

	queryPairs.forEach((pair) => {
		const key = pair.hasNegation
			? `${pair.key}-not ${pair.operator}`.trim().toLowerCase()
			: `${pair.key}-${pair.operator}`.trim().toLowerCase();
		queryPairsMap.set(key, pair);
	});

	return queryPairsMap;
};

export const convertFiltersToExpressionWithExistingQuery = (
	filters: TagFilter,
	existingQuery: string | undefined,
): { filters: TagFilter; filter: { expression: string } } => {
	// Check for deprecated operators and replace them with new operators
	const updatedFilters = cloneDeep(filters);

	// Replace deprecated operators in filter items
	if (updatedFilters?.items) {
		updatedFilters.items = updatedFilters.items.map((item) => {
			const opLower = item.op?.toLowerCase();
			if (Object.keys(DEPRECATED_OPERATORS_MAP).includes(opLower)) {
				return {
					...item,
					op: DEPRECATED_OPERATORS_MAP[
						opLower as keyof typeof DEPRECATED_OPERATORS_MAP
					].toLowerCase(),
				};
			}
			return item;
		});
	}

	if (!existingQuery) {
		// If no existing query, return filters with a newly generated expression
		return {
			filters: updatedFilters,
			filter: convertFiltersToExpression(updatedFilters),
		};
	}

	const nonExistingFilters: TagFilterItem[] = [];
	let modifiedQuery = existingQuery; // We'll modify this query as we proceed
	const visitedPairs: Set<string> = new Set(); // Set to track visited query pairs

	// Map extracted query pairs to key-specific pair information for faster access
	let queryPairsMap = getQueryPairsMap(existingQuery);

	filters?.items?.forEach((filter) => {
		const { key, op, value } = filter;

		// Skip invalid filters with no key
		if (!key) {
			return;
		}

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

				// Check if existing values match current filter values (for array-based operators)
				if (existingPair.valueList && filter.value && Array.isArray(filter.value)) {
					// Clean quotes from string values for comparison
					const cleanValues = (values: any[]): any[] =>
						values.map((val) => (typeof val === 'string' ? unquote(val) : val));

					const cleanExistingValues = cleanValues(existingPair.valueList);
					const cleanFilterValues = cleanValues(filter.value);

					// Compare arrays (order-independent) - if identical, keep existing value
					const isSameValues =
						cleanExistingValues.length === cleanFilterValues.length &&
						isEqual(sortBy(cleanExistingValues), sortBy(cleanFilterValues));

					if (isSameValues) {
						// Values are identical, preserve existing formatting
						modifiedQuery =
							modifiedQuery.slice(0, existingPair.position.valueStart) +
							existingPair.value +
							modifiedQuery.slice(existingPair.position.valueEnd + 1);
						return;
					}
				}

				modifiedQuery =
					modifiedQuery.slice(0, existingPair.position.valueStart) +
					formattedValue +
					modifiedQuery.slice(existingPair.position.valueEnd + 1);

				queryPairsMap = getQueryPairsMap(modifiedQuery);
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
							queryPairsMap = getQueryPairsMap(modifiedQuery);
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
							queryPairsMap = getQueryPairsMap(modifiedQuery);
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
							queryPairsMap = getQueryPairsMap(modifiedQuery);
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
							queryPairsMap = getQueryPairsMap(modifiedQuery);
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
			const existingPair = queryPairsMap.get(
				`${filter.key?.key}-${filter.op}`.trim().toLowerCase(),
			);
			if (
				existingPair &&
				existingPair.position?.valueStart &&
				existingPair.position?.valueEnd
			) {
				const formattedValue = formatValueForExpression(value, op);
				// replace the value with the new value
				modifiedQuery =
					modifiedQuery.slice(0, existingPair.position.valueStart) +
					formattedValue +
					modifiedQuery.slice(existingPair.position.valueEnd + 1);
				queryPairsMap = getQueryPairsMap(modifiedQuery);
			}

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
					? (formatValuesForFilter(pair.valueList as string[]) ?? '')
					: (formatValuesForFilter(pair.value as string) ?? ''),
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
 * Removes clauses for specified keys from a filter query expression.
 *
 * Uses an ANTLR parse-tree traversal over the existing FilterQuery grammar so that
 * compound predicates like `BETWEEN x AND y`, `EXISTS`, and `IN (...)` are treated
 * as atomic nodes — their internal tokens are never confused with top-level AND/OR
 * conjunctions. Surviving siblings are rejoined with the correct operator at each
 * level of the tree, producing no dangling operators regardless of expression shape.
 * If the expression cannot be parsed, it is returned unchanged.
 *
 * @param expression - The full filter query string.
 * @param keysToRemove - Keys (case-insensitive) whose clauses should be dropped.
 * @param removeOnlyVariableExpressions - Controls which clauses are eligible for removal:
 *   - `false` (default): removes all clauses for the key regardless of value.
 *   - `true`: removes only the first clause whose value contains any `$`.
 *   - `string` (e.g. `"$service.name"`): removes only the clause whose value exactly
 *     matches that string — preferred when the specific variable reference is known.
 * @returns The rewritten expression, or an empty string if all clauses were removed.
 */
export const removeKeysFromExpression = (
	expression: string,
	keysToRemove: string[],
	removeOnlyVariableExpressions: string | boolean = false,
): string => {
	if (!keysToRemove || keysToRemove.length === 0) {
		return expression;
	}
	if (!expression.trim()) {
		return expression;
	}

	const keysSet = new Set(keysToRemove.map((k) => k.trim().toLowerCase()));
	// Tracks keys for which a variable expression has already been removed.
	// Having multiple $-value clauses for the same key is invalid; we remove at most one.
	const removedVariableKeys = new Set<string>();

	const chars = CharStreams.fromString(expression);
	const lexer = new FilterQueryLexer(chars);
	lexer.removeErrorListeners();
	const tokenStream = new CommonTokenStream(lexer);
	const parser = new FilterQueryParser(tokenStream);
	parser.removeErrorListeners();

	const tree = parser.query();

	// If the expression couldn't be parsed, return it unchanged rather than mangling it
	if (parser.syntaxErrorsCount > 0) {
		return expression;
	}

	// Extract original source text for a node, preserving the user's exact formatting
	const src = (ctx: ParserRuleContext): string =>
		expression.slice(ctx.start.start, (ctx.stop ?? ctx.start).stop + 1);

	// Returns null when the entire node should be dropped.
	// isSingle = true means the result is a single, non-compound expression at
	// this level (no AND/OR between sibling clauses), which lets the paren
	// visitor decide whether wrapping is still needed.
	type VisitResult = { text: string; isSingle: boolean } | null;

	function visitOrExpression(ctx: OrExpressionContext): VisitResult {
		const parts = ctx
			.andExpression_list()
			.map(visitAndExpression)
			.filter((r): r is NonNullable<VisitResult> => r !== null);
		if (parts.length === 0) {
			return null;
		}
		// Single surviving branch — pass its isSingle straight through so the
		// paren visitor can decide whether to keep the outer parens.
		if (parts.length === 1) {
			return parts[0];
		}
		return { text: parts.map((p) => p.text).join(' OR '), isSingle: false };
	}

	function visitAndExpression(ctx: AndExpressionContext): VisitResult {
		const parts = ctx
			.unaryExpression_list()
			.map(visitUnaryExpression)
			.filter((r): r is NonNullable<VisitResult> => r !== null);
		if (parts.length === 0) {
			return null;
		}
		if (parts.length === 1) {
			return { text: parts[0].text, isSingle: true };
		}
		return { text: parts.map((p) => p.text).join(' AND '), isSingle: false };
	}

	function visitUnaryExpression(ctx: UnaryExpressionContext): VisitResult {
		const primaryResult = visitPrimary(ctx.primary());
		if (primaryResult === null) {
			return null;
		}
		return ctx.NOT()
			? { text: `NOT ${primaryResult.text}`, isSingle: true }
			: primaryResult;
	}

	function visitPrimary(ctx: PrimaryContext): VisitResult {
		// Parenthesised sub-expression: ( orExpression )
		const orCtx = ctx.orExpression();
		if (orCtx) {
			const inner = visitOrExpression(orCtx);
			if (inner === null) {
				return null;
			}
			// Drop redundant parens when the group collapses to a single clause;
			// keep them when multiple clauses remain (operator-precedence matters).
			if (inner.isSingle) {
				return { text: inner.text, isSingle: true };
			}
			return { text: `(${inner.text})`, isSingle: true };
		}

		const compCtx = ctx.comparison();
		if (compCtx) {
			const result = visitComparison(compCtx);
			return result !== null ? { text: result, isSingle: true } : null;
		}

		// functionCall, fullText, bare key, bare value — keep verbatim
		return { text: src(ctx), isSingle: true };
	}

	function visitComparison(ctx: ComparisonContext): string | null {
		const keyText = ctx.key().getText().trim().toLowerCase();

		if (!keysSet.has(keyText)) {
			return src(ctx);
		}

		if (removeOnlyVariableExpressions) {
			// Scope the value check to value nodes only — not the full comparison text —
			// so a key that contains '$' does not trigger removal when the value is a
			// literal. The ANTLR4 runtime returns null from getTypedRuleContext when a
			// rule is absent, despite the non-nullable TypeScript signatures.
			const inCtx = ctx.inClause() as unknown as InClauseContext | null;
			const notInCtx = ctx.notInClause() as unknown as NotInClauseContext | null;
			// When a specific variable string is supplied, require an exact match so we
			// never accidentally remove a different $-valued clause for the same key.
			const matchesVariable = (text: string): boolean =>
				typeof removeOnlyVariableExpressions === 'string'
					? text === removeOnlyVariableExpressions
					: text.includes('$');

			const valueHasVariable = (): boolean => {
				// Simple comparisons: key = $var, BETWEEN $v1 AND $v2, etc.
				if (ctx.value_list().some((v) => matchesVariable(v.getText()))) {
					return true;
				}
				// IN $var (bare single value) or IN ($v1, $v2) (value list)
				if (inCtx) {
					const bare = inCtx.value() as unknown as { getText(): string } | null;
					if (bare && matchesVariable(bare.getText())) {
						return true;
					}
					const list = inCtx.valueList() as unknown as {
						value_list(): { getText(): string }[];
					} | null;
					if (list && list.value_list().some((v) => matchesVariable(v.getText()))) {
						return true;
					}
				}
				// NOT IN $var or NOT IN ($v1, $v2)
				if (notInCtx) {
					const bare = notInCtx.value() as unknown as { getText(): string } | null;
					if (bare && matchesVariable(bare.getText())) {
						return true;
					}
					const list = notInCtx.valueList() as unknown as {
						value_list(): { getText(): string }[];
					} | null;
					if (list && list.value_list().some((v) => matchesVariable(v.getText()))) {
						return true;
					}
				}
				return false;
			};

			if (valueHasVariable()) {
				if (removedVariableKeys.has(keyText)) {
					return src(ctx);
				}
				removedVariableKeys.add(keyText);
				return null;
			}
			return src(ctx);
		}

		return null;
	}

	const result = visitOrExpression(tree.expression().orExpression());
	return result?.text ?? '';
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
		queryData.reduce(
			(acc, query) => {
				if (query.queryName && query.aggregations?.length) {
					acc[query.queryName] = createAggregation(query).map((a: any) => ({
						alias: a.alias,
						expression: a.expression,
					}));
				}
				return acc;
			},
			{} as Record<string, any>,
		) || {};

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
				aggregateAttribute: _aggregateAttribute,
				aggregateOperator: _aggregateOperator,
				timeAggregation: _timeAggregation,
				spaceAggregation: _spaceAggregation,
				reduceTo: _reduceTo,
				filters: _filters,
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
