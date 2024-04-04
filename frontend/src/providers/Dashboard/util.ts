import { Layout } from 'react-grid-layout';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const getPreviousWidgets = (
	selectedDashboard: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	(selectedDashboard.data.widgets?.slice(
		0,
		selectedWidgetIndex || 0,
	) as Widgets[]) || [];

export const getNextWidgets = (
	selectedDashboard: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	(selectedDashboard.data.widgets?.slice(
		(selectedWidgetIndex || 0) + 1, // this is never undefined
		selectedDashboard.data.widgets?.length,
	) as Widgets[]) || [];

export const getSelectedWidgetIndex = (
	selectedDashboard: Dashboard,
	widgetId: string | null,
): number =>
	selectedDashboard.data.widgets?.findIndex((e) => e.id === widgetId) || 0;

export const sortLayout = (layout: Layout[]): Layout[] =>
	[...layout].sort((a, b) => {
		if (a.y === b.y) {
			return a.x - b.x;
		}
		return a.y - b.y;
	});
