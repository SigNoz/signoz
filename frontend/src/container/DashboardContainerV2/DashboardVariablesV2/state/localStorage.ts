import type { SelectionsByName } from './types';

const STORAGE_PREFIX = 'dashboard-v2-variables';

function storageKey(dashboardId: string): string {
	return `${STORAGE_PREFIX}:${dashboardId}`;
}

export function loadSelectionsFromStorage(
	dashboardId: string,
): SelectionsByName {
	if (!dashboardId) {return {};}
	try {
		const raw = window.localStorage.getItem(storageKey(dashboardId));
		if (!raw) {return {};}
		const parsed = JSON.parse(raw) as SelectionsByName;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function saveSelectionsToStorage(
	dashboardId: string,
	selections: SelectionsByName,
): void {
	if (!dashboardId) {return;}
	try {
		window.localStorage.setItem(
			storageKey(dashboardId),
			JSON.stringify(selections),
		);
	} catch {
		// quota / availability issues — selection still lives in memory + URL
	}
}
