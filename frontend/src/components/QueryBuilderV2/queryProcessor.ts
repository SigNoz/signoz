/* eslint-disable sonarjs/cognitive-complexity */
import {
	DEPRECATED_OPERATORS_MAP,
	OPERATORS,
} from 'constants/antlrQueryConstants';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { cloneDeep } from 'lodash-es';
import { IQueryPair } from 'types/antlrQueryTypes';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { unquote } from 'utils/stringUtils';
import { v4 as uuid } from 'uuid';

import { convertFiltersToExpression } from './utils';

interface ProcessingResult {
	type: 'update' | 'add' | 'skip' | 'transform';
	modifications?: QueryModification[];
	newFilters?: TagFilterItem[];
	shouldAddToNonExisting?: boolean;
}

interface QueryModification {
	type: 'replace' | 'append' | 'prepend';
	startIndex?: number;
	endIndex?: number;
	newContent: string;
}

interface QueryProcessingContext {
	readonly originalQuery: string;
	queryPairsMap: Map<string, IQueryPair>;
	readonly visitedPairs: Set<string>;
	modifications: QueryModification[];
	newFilters: TagFilterItem[];
	nonExistingFilters: TagFilterItem[];
	modifiedQuery: string;
}

// Cache for query pairs to avoid repeated parsing
const queryPairsCache = new Map<string, Map<string, IQueryPair>>();

// Validation functions
const validateFilter = (filter: TagFilterItem): boolean =>
	!!(filter.key?.key && filter.op && filter.value !== undefined);

const validateQuery = (query: string): boolean =>
	typeof query === 'string' && query.trim().length > 0;

const areValuesEqual = (existing: unknown[], current: unknown[]): boolean => {
	if (existing.length !== current.length) return false;

	const existingSet = new Set(existing.map((v) => String(v)));
	return current.every((v) => existingSet.has(String(v)));
};

// Format a value for the expression string
const formatValueForExpression = (
	value: string[] | string | number | boolean,
	operator?: string,
): string => {
	// Check if it's a variable
	const isVariable = (val: string | string[] | number | boolean): boolean => {
		if (Array.isArray(val)) {
			return val.some((v) => typeof v === 'string' && v.trim().startsWith('$'));
		}
		return typeof val === 'string' && val.trim().startsWith('$');
	};

	if (isVariable(value)) {
		return String(value);
	}

	// Check if operator requires array values
	const isArrayOperator = (op: string): boolean => {
		const arrayOperators = ['in', 'not in', 'IN', 'NOT IN'];
		return arrayOperators.includes(op);
	};

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

// Clear cache when needed (e.g., for testing or memory management)
export const clearQueryPairsCache = (): void => {
	queryPairsCache.clear();
};

const getQueryPairsMap = (query: string): Map<string, IQueryPair> => {
	const trimmedQuery = query.trim();

	if (!queryPairsCache.has(trimmedQuery)) {
		const queryPairs = extractQueryPairs(trimmedQuery) || [];
		const queryPairsMap: Map<string, IQueryPair> = new Map();

		queryPairs.forEach((pair) => {
			const key = pair.hasNegation
				? `${pair.key}-not ${pair.operator}`.trim().toLowerCase()
				: `${pair.key}-${pair.operator}`.trim().toLowerCase();
			queryPairsMap.set(key, pair);
		});

		queryPairsCache.set(trimmedQuery, queryPairsMap);
	}

	return queryPairsCache.get(trimmedQuery) || new Map();
};

// Helper function to normalize deprecated operators
const normalizeDeprecatedOperators = (filters: TagFilter): TagFilter => {
	const updatedFilters = cloneDeep(filters);

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

	return updatedFilters;
};

// ES5 compatible operator handlers using functions instead of classes

// Helper function to check if operator is IN or NOT IN
function isInOperator(operator: string): boolean {
	const sanitizedOperator = operator.trim().toUpperCase();
	return (
		[OPERATORS.IN, `${OPERATORS.NOT} ${OPERATORS.IN}`].indexOf(
			sanitizedOperator,
		) !== -1
	);
}

// Helper function to handle IN operator transformations
// Generic helper function to handle operator transformations
function handleOperatorTransformation(
	filter: TagFilterItem,
	context: QueryProcessingContext,
	formattedValue: string,
	targetOperator: string,
	transformationConfigs: Array<{
		operatorKey: string;
		positionProperty: 'operatorStart' | 'negationStart';
	}>,
): ProcessingResult {
	const { key } = filter;
	const { op } = filter;

	// Skip if key is not defined
	if (!key || !key.key) {
		return { type: 'add', shouldAddToNonExisting: true };
	}

	// Check each transformation configuration
	const foundConfig = transformationConfigs.find((config) => {
		const transformationKey = `${key.key}-${config.operatorKey}`;
		const transformationKeyLower = transformationKey.trim().toLowerCase();
		return context.queryPairsMap.has(transformationKeyLower);
	});

	if (foundConfig) {
		const transformationKey = `${key.key}-${foundConfig.operatorKey}`;
		const transformationKeyLower = transformationKey.trim().toLowerCase();
		const transformationPair = context.queryPairsMap.get(transformationKeyLower);
		context.visitedPairs.add(transformationKeyLower);

		if (
			transformationPair &&
			transformationPair.position &&
			transformationPair.position.valueEnd
		) {
			const startPosition =
				transformationPair.position[foundConfig.positionProperty];
			context.modifiedQuery = `${
				context.modifiedQuery.slice(0, startPosition) + targetOperator
			} ${formattedValue} ${context.modifiedQuery.slice(
				transformationPair.position.valueEnd + 1,
			)}`;
			context.queryPairsMap = getQueryPairsMap(context.modifiedQuery.trim());
		}
		// Mark the current filter as visited to prevent it from being added as a new filter
		context.visitedPairs.add(`${key.key}-${op}`.trim().toLowerCase());
		return { type: 'transform', shouldAddToNonExisting: false };
	}

	return { type: 'add', shouldAddToNonExisting: true };
}

function handleInTransformations(
	filter: TagFilterItem,
	context: QueryProcessingContext,
	formattedValue: string,
): ProcessingResult {
	const transformationConfigs = [
		{
			operatorKey: `${OPERATORS.NOT} ${filter.op}`,
			positionProperty: 'negationStart' as const,
		},
		{ operatorKey: OPERATORS['='], positionProperty: 'operatorStart' as const },
		{ operatorKey: OPERATORS['!='], positionProperty: 'operatorStart' as const },
	];

	return handleOperatorTransformation(
		filter,
		context,
		formattedValue,
		OPERATORS.IN,
		transformationConfigs,
	);
}

// Helper function to handle NOT IN operator transformations
function handleNotInTransformations(
	filter: TagFilterItem,
	context: QueryProcessingContext,
	formattedValue: string,
): ProcessingResult {
	const transformationConfigs = [
		{ operatorKey: OPERATORS['!='], positionProperty: 'operatorStart' as const },
	];

	return handleOperatorTransformation(
		filter,
		context,
		formattedValue,
		`${OPERATORS.NOT} ${OPERATORS.IN}`,
		transformationConfigs,
	);
}

// Helper function to handle operator transformations
function handleOperatorTransformations(
	filter: TagFilterItem,
	context: QueryProcessingContext,
	formattedValue: string,
): ProcessingResult {
	const { op } = filter;
	const sanitizedOperator = op.trim().toUpperCase();

	if (sanitizedOperator === OPERATORS.IN) {
		return handleInTransformations(filter, context, formattedValue);
	}
	if (sanitizedOperator === `${OPERATORS.NOT} ${OPERATORS.IN}`) {
		return handleNotInTransformations(filter, context, formattedValue);
	}
	return { type: 'add', shouldAddToNonExisting: true };
}

// ES5 compatible operator handler functions
function processInOperator(
	filter: TagFilterItem,
	context: QueryProcessingContext,
): ProcessingResult {
	const { key } = filter;
	const { op } = filter;
	const { value } = filter;

	// Skip if key is not defined
	if (!key || !key.key) {
		return { type: 'skip' };
	}

	const formattedValue = formatValueForExpression(value, op);
	const pairKey = `${key.key}-${op}`.trim().toLowerCase();

	// Check if exact match exists
	const existingPair = context.queryPairsMap.get(pairKey);
	if (
		existingPair &&
		existingPair.position &&
		existingPair.position.valueStart &&
		existingPair.position.valueEnd
	) {
		context.visitedPairs.add(pairKey);

		// Check if values are identical for array-based operators
		if (existingPair.valueList && filter.value && Array.isArray(filter.value)) {
			const cleanValues = (values: unknown[]): unknown[] =>
				values.map((val) => (typeof val === 'string' ? unquote(val) : val));

			const cleanExistingValues = cleanValues(existingPair.valueList);
			const cleanFilterValues = cleanValues(filter.value);

			if (areValuesEqual(cleanExistingValues, cleanFilterValues)) {
				// Values are identical, preserve existing formatting
				context.modifiedQuery =
					context.modifiedQuery.slice(0, existingPair.position.valueStart) +
					existingPair.value +
					context.modifiedQuery.slice(existingPair.position.valueEnd + 1);
				return { type: 'skip' };
			}
		}

		// Update the value
		context.modifiedQuery =
			context.modifiedQuery.slice(0, existingPair.position.valueStart) +
			formattedValue +
			context.modifiedQuery.slice(existingPair.position.valueEnd + 1);

		// Update the query pairs map
		context.queryPairsMap = getQueryPairsMap(context.modifiedQuery);
		return { type: 'update' };
	}

	// Handle operator transformations
	return handleOperatorTransformations(filter, context, formattedValue);
}

function processDefaultOperator(
	filter: TagFilterItem,
	context: QueryProcessingContext,
): ProcessingResult {
	const { key } = filter;
	const { op } = filter;
	const { value } = filter;

	// Skip if key is not defined
	if (!key || !key.key) {
		return { type: 'add', shouldAddToNonExisting: true };
	}

	const pairKey = `${key.key}-${op}`.trim().toLowerCase();

	if (context.queryPairsMap.has(pairKey)) {
		const existingPair = context.queryPairsMap.get(pairKey);
		context.visitedPairs.add(pairKey);

		if (
			existingPair &&
			existingPair.position &&
			existingPair.position.valueStart &&
			existingPair.position.valueEnd
		) {
			const formattedValue = formatValueForExpression(value, op);
			context.modifiedQuery =
				context.modifiedQuery.slice(0, existingPair.position.valueStart) +
				formattedValue +
				context.modifiedQuery.slice(existingPair.position.valueEnd + 1);
			context.queryPairsMap = getQueryPairsMap(context.modifiedQuery);
		}
		return { type: 'update' };
	}

	return { type: 'add', shouldAddToNonExisting: true };
}

// Factory function to get appropriate handler
function getOperatorHandler(
	operator: string,
): (
	filter: TagFilterItem,
	context: QueryProcessingContext,
) => ProcessingResult {
	if (isInOperator(operator)) {
		return processInOperator;
	}
	return processDefaultOperator;
}

// Helper function to create new filter items from unvisited query pairs
const createNewFilterItems = (
	context: QueryProcessingContext,
): TagFilterItem[] => {
	const newFilterItems: TagFilterItem[] = [];

	context.queryPairsMap.forEach((pair, key) => {
		if (!context.visitedPairs.has(key)) {
			const operator = pair.hasNegation
				? getOperatorValue(`NOT_${pair.operator}`.toUpperCase())
				: getOperatorValue(pair.operator.toUpperCase());

			const formatValuesForFilter = (
				value: string | string[],
			): string | string[] => {
				if (Array.isArray(value)) {
					return value.map((v) => (typeof v === 'string' ? unquote(v) : String(v)));
				}
				if (typeof value === 'string') {
					return unquote(value);
				}
				return String(value);
			};

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

	return newFilterItems;
};

// Main refactored function
export const convertFiltersToExpressionWithExistingQuery = (
	filters: TagFilter,
	existingQuery: string | undefined,
): { filters: TagFilter; filter: { expression: string } } => {
	// Early return for no existing query
	if (!existingQuery) {
		const normalizedFilters = normalizeDeprecatedOperators(filters);
		const expression = convertFiltersToExpression(normalizedFilters);
		return {
			filters: normalizedFilters,
			filter: expression,
		};
	}

	// Validate inputs
	if (!validateQuery(existingQuery)) {
		return { filters, filter: { expression: existingQuery || '' } };
	}

	// Normalize deprecated operators
	const normalizedFilters = normalizeDeprecatedOperators(filters);

	// Initialize processing context
	const context: QueryProcessingContext = {
		originalQuery: existingQuery,
		queryPairsMap: getQueryPairsMap(existingQuery.trim()),
		visitedPairs: new Set(),
		modifications: [],
		newFilters: [],
		nonExistingFilters: [],
		modifiedQuery: existingQuery,
	};

	// Process each filter (if any exist)
	if (normalizedFilters.items?.length > 0) {
		normalizedFilters.items.filter(validateFilter).forEach((filter) => {
			const handler = getOperatorHandler(filter.op);
			const result = handler(filter, context);

			// Apply result based on type
			switch (result.type) {
				case 'add':
					if (result.shouldAddToNonExisting) {
						context.nonExistingFilters.push(filter);
					}
					break;
				case 'update':
				case 'transform':
				case 'skip':
					// Already handled in the processor
					break;
				default:
					// Handle any other cases
					break;
			}
		});
	}

	// Create new filter items from unvisited query pairs
	const newFilterItems = createNewFilterItems(context);

	// Merge new filter items with existing ones
	if (newFilterItems.length > 0) {
		if (normalizedFilters?.items?.length > 0) {
			// Add new filter items to existing ones
			normalizedFilters.items = [...normalizedFilters.items, ...newFilterItems];
		} else {
			// Use new filter items as the main filters
			normalizedFilters.items = newFilterItems;
		}
	}

	// Build final expression
	let finalExpression = context.modifiedQuery;

	if (context.nonExistingFilters.length > 0) {
		// Convert non-existing filters to expression and append
		const nonExistingFilterExpression = convertFiltersToExpression({
			items: context.nonExistingFilters,
			op: filters.op || 'AND',
		});

		if (nonExistingFilterExpression.expression) {
			finalExpression = `${context.modifiedQuery.trim()} ${
				nonExistingFilterExpression.expression
			}`;
		}
	}

	return {
		filters: normalizedFilters,
		filter: { expression: finalExpression || '' },
	};
};
