import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { OPERATORS } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 } from 'uuid';

import {
	parseFilterExpression,
	replaceValueInExpression,
	replaceValuesInExpression,
} from './expressionUtils';
import type {
	CombinedFilterSuggestion,
	FilterValueSuggestion,
	ParsedExpressionFilter,
} from './types';

interface NormalizedFilter {
	key: string;
	op: '=' | 'IN';
	values: string[];
	dataType: DataTypes;
	keyType: string;
	isFromExpression: boolean;
	sourceFilterItem?: TagFilterItem;
}

function isEligibleOperator(op: string): boolean {
	const upperOp = op?.toUpperCase();
	return upperOp === OPERATORS['='] || upperOp === OPERATORS.IN;
}

function findCaseInsensitiveMatch(
	matchedValues: string[],
	searchValue: string,
): string | null {
	let caseInsensitiveMatch: string | null = null;

	for (const value of matchedValues) {
		if (value === searchValue) {
			return null;
		}
		if (
			!caseInsensitiveMatch &&
			value.toLowerCase() === searchValue.toLowerCase()
		) {
			caseInsensitiveMatch = value;
		}
	}

	return caseInsensitiveMatch;
}

function extractFromExpression(
	parsedFilters: ParsedExpressionFilter[],
	filterItems: TagFilterItem[],
): NormalizedFilter[] {
	return parsedFilters
		.map((parsed) => {
			const validValues = parsed.values.filter((v) => v.trim() !== '');
			if (validValues.length === 0) return null;

			const matchingItem = filterItems.find(
				(item) =>
					item.key?.key === parsed.key &&
					isEligibleOperator(item.op || '') &&
					validValues.some((v) =>
						Array.isArray(item.value) ? item.value.includes(v) : item.value === v,
					),
			);

			return {
				key: parsed.key,
				op: parsed.op === 'IN' ? 'IN' : '=',
				values: validValues,
				dataType: matchingItem?.key?.dataType || DataTypes.String,
				keyType: matchingItem?.key?.type || '',
				isFromExpression: !matchingItem,
				sourceFilterItem: matchingItem,
			} as NormalizedFilter;
		})
		.filter((filter): filter is NormalizedFilter => filter !== null);
}

async function fetchValueSuggestion(
	queryData: IBuilderQuery,
	attributeKey: string,
	dataType: DataTypes,
	keyType: string,
	searchValue: string,
): Promise<string | null> {
	const tagTypesToTry = keyType ? [keyType] : ['resource', 'tag'];

	for (const tagType of tagTypesToTry) {
		try {
			const response = await getAttributesValues({
				dataSource: queryData.dataSource,
				aggregateOperator: queryData.aggregateOperator || '',
				aggregateAttribute: queryData.aggregateAttribute?.key || '',
				attributeKey,
				filterAttributeKeyDataType: dataType,
				tagType,
				searchText: searchValue,
			});

			if (response.statusCode === 200 && response.payload?.stringAttributeValues) {
				const suggested = findCaseInsensitiveMatch(
					response.payload.stringAttributeValues,
					searchValue,
				);
				if (suggested) return suggested;
			}
		} catch {
			// Ignore errors and try the next tag type
		}
	}

	return null;
}

function createFilterItem(filter: NormalizedFilter): TagFilterItem {
	if (filter.sourceFilterItem) {
		return filter.sourceFilterItem;
	}

	return {
		id: v4(),
		key: {
			key: filter.key,
			type: filter.keyType || 'resource',
			dataType: filter.dataType,
			id: filter.key,
		},
		op: filter.op,
		value: filter.op === 'IN' ? filter.values : filter.values[0],
	};
}

async function processFilter(
	queryData: IBuilderQuery,
	filter: NormalizedFilter,
): Promise<FilterValueSuggestion | null> {
	const results = await Promise.all(
		filter.values.map((value) =>
			fetchValueSuggestion(
				queryData,
				filter.key,
				filter.dataType,
				filter.keyType,
				value,
			),
		),
	);

	const hasCorrection = results.some((r) => r !== null);
	if (!hasCorrection) return null;

	const filterItem = createFilterItem(filter);
	const isInOp = filter.op === 'IN';

	if (isInOp) {
		const suggestedValues = filter.values.map((v, i) => results[i] ?? v);

		return {
			filterItem,
			originalValue: filter.values.join(', '),
			suggestedValue: suggestedValues.join(', '),
			originalValues: filter.values,
			suggestedValues,
			...(filter.isFromExpression && { isFromExpression: true }),
		};
	}

	const suggested = results[0];
	if (!suggested) return null;

	return {
		filterItem,
		originalValue: filter.values[0],
		suggestedValue: suggested,
		...(filter.isFromExpression && { isFromExpression: true }),
	};
}

function deduplicateSuggestions(
	suggestions: FilterValueSuggestion[],
): FilterValueSuggestion[] {
	const seen = new Set<string>();

	return suggestions.filter((suggestion) => {
		const key = suggestion.filterItem.key?.key || '';
		const op = suggestion.filterItem.op?.toUpperCase() || '=';

		const value =
			op === 'IN' && suggestion.originalValues
				? suggestion.originalValues.join(',')
				: suggestion.originalValue;

		const identifier = `${key}:${op}:${value}`;
		if (seen.has(identifier)) return false;
		seen.add(identifier);
		return true;
	});
}

function buildCombinedSuggestion(
	originalExpression: string,
	suggestions: FilterValueSuggestion[],
): CombinedFilterSuggestion | null {
	if (!originalExpression || !suggestions.length) return null;

	let modifiedExpression = originalExpression;
	const corrections: CombinedFilterSuggestion['corrections'] = [];

	for (const suggestion of suggestions) {
		const key = suggestion.filterItem.key?.key || '';
		const isInOp = suggestion.filterItem.op?.toUpperCase() === 'IN';

		if (isInOp && suggestion.originalValues && suggestion.suggestedValues) {
			modifiedExpression = replaceValuesInExpression(
				modifiedExpression,
				key,
				suggestion.originalValues,
				suggestion.suggestedValues,
			);
			corrections.push({
				key,
				originalValue: suggestion.originalValues,
				suggestedValue: suggestion.suggestedValues,
			});
		} else {
			modifiedExpression = replaceValueInExpression(
				modifiedExpression,
				key,
				suggestion.originalValue,
				suggestion.suggestedValue,
			);
			corrections.push({
				key,
				originalValue: suggestion.originalValue,
				suggestedValue: suggestion.suggestedValue,
			});
		}
	}

	if (modifiedExpression === originalExpression) return null;

	return {
		originalExpression,
		suggestedExpression: modifiedExpression,
		corrections,
	};
}

export async function getSuggestions(
	queryData: IBuilderQuery,
): Promise<{
	suggestions: FilterValueSuggestion[];
	combinedSuggestion: CombinedFilterSuggestion | null;
	isLoading: boolean;
}> {
	const filterItems = queryData.filters?.items || [];
	const expression = queryData.filter?.expression || '';

	const parsedFilters = expression ? parseFilterExpression(expression) : [];
	const hasExpression = parsedFilters.length > 0;

	if (!hasExpression) {
		return { suggestions: [], combinedSuggestion: null, isLoading: false };
	}

	const normalizedFilters = extractFromExpression(parsedFilters, filterItems);

	if (normalizedFilters.length === 0) {
		return { suggestions: [], combinedSuggestion: null, isLoading: false };
	}

	const results = await Promise.all(
		normalizedFilters.map((filter) => processFilter(queryData, filter)),
	);

	const validSuggestions = results.filter(
		(s): s is FilterValueSuggestion => s !== null,
	);
	const suggestions = deduplicateSuggestions(validSuggestions);

	const combinedSuggestion =
		suggestions.length > 0
			? buildCombinedSuggestion(expression, suggestions)
			: null;

	return { suggestions, combinedSuggestion, isLoading: false };
}
