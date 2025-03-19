import { FORMULA_REGEXP } from 'constants/regExp';
import { Layout } from 'react-grid-layout';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];

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
