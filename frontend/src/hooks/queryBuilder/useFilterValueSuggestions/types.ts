import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

export interface FilterValueSuggestion {
	filterItem: TagFilterItem;
	originalValue: string;
	suggestedValue: string;
	originalValues?: string[];
	suggestedValues?: string[];
	isFromExpression?: boolean;
}

export interface CombinedFilterSuggestion {
	originalExpression: string;
	suggestedExpression: string;
	corrections: Array<{
		key: string;
		originalValue: string | string[];
		suggestedValue: string | string[];
	}>;
}

export interface ParsedExpressionFilter {
	key: string;
	op: string;
	values: string[];
	index: number;
}
