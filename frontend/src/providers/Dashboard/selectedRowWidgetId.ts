const PREFIX = 'dashboard_row_widget_';

function getKey(dashboardId: string): string {
	return `${PREFIX}${dashboardId}`;
}

export function setSelectedRowWidgetId(
	dashboardId: string,
	widgetId: string,
): void {
	Object.keys(sessionStorage)
		.filter((k) => k.startsWith(PREFIX) && k !== getKey(dashboardId))
		.forEach((k) => sessionStorage.removeItem(k));
	sessionStorage.setItem(getKey(dashboardId), widgetId);
}

export function getSelectedRowWidgetId(dashboardId: string): string | null {
	return sessionStorage.getItem(getKey(dashboardId));
}

export function clearSelectedRowWidgetId(dashboardId: string): void {
	sessionStorage.removeItem(getKey(dashboardId));
}
