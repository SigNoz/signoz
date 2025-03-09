import { FORMULA_REGEXP } from 'constants/regExp';
import { Layout } from 'react-grid-layout';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 } from 'uuid';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];

export const createFilterFromData = (
	data: Record<string, unknown>,
): TagFilterItem[] =>
	Object.entries(data ?? {}).map(([key, value]) => ({
		id: v4(),
		key: {
			key,
			dataType: DataTypes.String,
			type: '',
			isColumn: false,
			isJSON: false,
			id: `${key}--string----false`,
		},
		op: '=',
		value: value?.toString() ?? '',
	}));

export const isFormula = (queryName: string): boolean =>
	FORMULA_REGEXP.test(queryName);

/**
 * Extracts query names from a formula expression
 * Specifically targets capital letters A-Z as query names, as after Z we dont have any query names
 */
export function extractQueryNamesFromExpression(expression: string): string[] {
	if (!expression) return [];

	// Use regex to match standalone capital letters
	// Uses word boundaries to ensure we only get standalone letters
	const queryNameRegex = /\b[A-Z]\b/g;

	// Extract matches and deduplicate
	return [...new Set(expression.match(queryNameRegex) || [])];
}
