import { useCallback, useMemo } from 'react';
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';

import { applyExpression, ExpressionFilterProps } from './types';

export type SpanCategory =
	| 'All'
	| 'Database'
	| 'Functions'
	| 'HTTP'
	| 'Jobs'
	| 'LLM';

export const SPAN_CATEGORIES: readonly SpanCategory[] = [
	'All',
	'Database',
	'Functions',
	'HTTP',
	'Jobs',
	'LLM',
];

// Map each category to the attribute key it filters on
const CATEGORY_KEYS: Record<Exclude<SpanCategory, 'All'>, string> = {
	Database: 'db.system',
	HTTP: 'http.method',
	Functions: 'kind_string',
	Jobs: 'messaging.system',
	LLM: 'gen_ai.request.model',
};

// All category keys — used for bulk removal when switching categories
const ALL_CATEGORY_KEYS = Object.values(CATEGORY_KEYS);

// The expression clause to add for each category
const CATEGORY_EXPRESSIONS: Record<Exclude<SpanCategory, 'All'>, string> = {
	Database: 'db.system exists',
	HTTP: 'http.method exists',
	Functions: "kind_string = 'Internal'",
	Jobs: 'messaging.system exists',
	LLM: 'gen_ai.request.model exists',
};

interface UseSpanCategoryFilterReturn {
	selectedCategory: SpanCategory;
	categories: readonly SpanCategory[];
	handleCategoryChange: (category: SpanCategory) => void;
}

export function useSpanCategoryFilter(
	props: ExpressionFilterProps,
): UseSpanCategoryFilterReturn {
	const { expression, filters, setExpression, expressionRef, runQuery } = props;

	// Derive active category from filters (only updates after runQuery)
	const selectedCategory = useMemo((): SpanCategory => {
		for (const [category, key] of Object.entries(CATEGORY_KEYS)) {
			if (filters.items.some((item) => item.key?.key === key)) {
				return category as SpanCategory;
			}
		}
		return 'All';
	}, [filters]);

	const handleCategoryChange = useCallback(
		(category: SpanCategory): void => {
			// Remove ALL category keys first
			let newExpr = removeKeysFromExpression(expression, ALL_CATEGORY_KEYS);
			// Add the selected category clause (unless "All")
			if (category !== 'All') {
				const clause = CATEGORY_EXPRESSIONS[category];
				newExpr = newExpr.trim() ? `${newExpr.trim()} AND ${clause}` : clause;
			}
			applyExpression(newExpr, { setExpression, expressionRef, runQuery });
		},
		[expression, setExpression, expressionRef, runQuery],
	);

	return {
		selectedCategory,
		categories: SPAN_CATEGORIES,
		handleCategoryChange,
	};
}
