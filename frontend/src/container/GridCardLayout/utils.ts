import { FORMULA_REGEXP } from 'constants/regExp';
import { isEmpty, isEqual } from 'lodash-es';
import { Layout } from 'react-grid-layout';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

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

export const hasColumnWidthsChanged = (
	columnWidths: Record<string, Record<string, number>>,
	selectedDashboard?: Dashboard,
): boolean => {
	// If no column widths stored, no changes
	if (isEmpty(columnWidths) || !selectedDashboard) return false;

	// Check each widget's column widths
	return Object.keys(columnWidths).some((widgetId) => {
		const dashboardWidget = selectedDashboard?.data?.widgets?.find(
			(widget) => widget.id === widgetId,
		) as Widgets;

		const newWidths = columnWidths[widgetId];
		const existingWidths = dashboardWidget?.columnWidths;

		// If both are empty/undefined, no change
		if (isEmpty(newWidths) || isEmpty(existingWidths)) return false;

		// Compare stored column widths with dashboard widget's column widths
		return !isEqual(newWidths, existingWidths);
	});
};
