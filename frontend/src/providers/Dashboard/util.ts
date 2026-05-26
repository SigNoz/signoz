import { Layout } from 'react-grid-layout';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const getPreviousWidgets = (
	dashboardData: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	(dashboardData.data.widgets?.slice(
		0,
		selectedWidgetIndex || 0,
	) as Widgets[]) || [];

export const getNextWidgets = (
	dashboardData: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	(dashboardData.data.widgets?.slice(
		(selectedWidgetIndex || 0) + 1, // this is never undefined
		dashboardData.data.widgets?.length,
	) as Widgets[]) || [];

export const getSelectedWidgetIndex = (
	dashboardData: Dashboard,
	widgetId: string | null,
): number =>
	dashboardData.data.widgets?.findIndex((e) => e.id === widgetId) || 0;

export const sortLayout = (layout: Layout[]): Layout[] =>
	[...layout].sort((a, b) => {
		if (a.y === b.y) {
			return a.x - b.x;
		}
		return a.y - b.y;
	});
