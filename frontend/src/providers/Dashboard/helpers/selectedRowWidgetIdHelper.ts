import getSessionStorageApi from 'api/browser/sessionstorage/get';
import removeSessionStorageApi from 'api/browser/sessionstorage/remove';
import setSessionStorageApi from 'api/browser/sessionstorage/set';
import { getScopedKey } from 'utils/storage';

const PREFIX = 'dashboard_row_widget_';

function getKey(dashboardId: string): string {
	return `${PREFIX}${dashboardId}`;
}

export function setSelectedRowWidgetId(
	dashboardId: string,
	widgetId: string,
): void {
	const unscopedKey = getKey(dashboardId);
	const scopedPrefix = getScopedKey(PREFIX);
	const scopedKey = getScopedKey(unscopedKey);

	// Object.keys returns the raw/already-scoped keys from the browser.
	// Direct sessionStorage.removeItem is intentional here — k is already fully scoped.
	// oxlint-disable-next-line no-restricted-globals
	Object.keys(sessionStorage)
		.filter((k) => k.startsWith(scopedPrefix) && k !== scopedKey)
		// oxlint-disable-next-line no-restricted-globals
		.forEach((k) => sessionStorage.removeItem(k));

	setSessionStorageApi(unscopedKey, widgetId);
}

export function getSelectedRowWidgetId(dashboardId: string): string | null {
	return getSessionStorageApi(getKey(dashboardId));
}

export function clearSelectedRowWidgetId(dashboardId: string): void {
	removeSessionStorageApi(getKey(dashboardId));
}
