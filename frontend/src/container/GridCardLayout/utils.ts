import { isEmpty, isEqual } from 'lodash-es';
import { Layout } from 'react-grid-layout';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];

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

		// Compare stored column widths with dashboard widget's column widths
		return !isEqual(columnWidths[widgetId], dashboardWidget?.columnWidths);
	});
};
