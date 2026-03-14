const PREFIX = 'dashboard_row_widget_';

function getKey(dashboardId: string): string {
	return `${PREFIX}${dashboardId}`;
}

export function setSelectedRowWidgetId(
	dashboardId: string,
	widgetId: string,
): void {
	const key = getKey(dashboardId);

	// remove all other selected widget ids for the dashboard before setting the new one
	// to ensure only one widget is selected at a time. Helps out in weird navigate and refresh scenarios
	Object.keys(sessionStorage)
		.filter((k) => k.startsWith(PREFIX) && k !== key)
		.forEach((k) => sessionStorage.removeItem(k));

	sessionStorage.setItem(key, widgetId);
}

export function getSelectedRowWidgetId(dashboardId: string): string | null {
	return sessionStorage.getItem(getKey(dashboardId));
}

export function clearSelectedRowWidgetId(dashboardId: string): void {
	sessionStorage.removeItem(getKey(dashboardId));
}
