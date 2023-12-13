import { Dashboard, Widgets } from 'types/api/dashboard/getAll';

export const getPreviousWidgets = (
	selectedDashboard: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	selectedDashboard.data.widgets?.slice(0, selectedWidgetIndex || 0) || [];

export const getNextWidgets = (
	selectedDashboard: Dashboard,
	selectedWidgetIndex: number,
): Widgets[] =>
	selectedDashboard.data.widgets?.slice(
		(selectedWidgetIndex || 0) + 1, // this is never undefined
		selectedDashboard.data.widgets?.length,
	) || [];

export const getSelectedWidgetIndex = (
	selectedDashboard: Dashboard,
	widgetId: string | null,
): number =>
	selectedDashboard.data.widgets?.findIndex((e) => e.id === widgetId) || 0;
