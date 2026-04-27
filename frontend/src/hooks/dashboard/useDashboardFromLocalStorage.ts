import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export interface LocalStoreDashboardVariables {
	[id: string]: {
		selectedValue: IDashboardVariable['selectedValue'];
		allSelected: boolean;
	};
}

interface DashboardLocalStorageVariables {
	[id: string]: LocalStoreDashboardVariables;
}

function readAll(): DashboardLocalStorageVariables {
	const raw = getLocalStorageKey(LOCALSTORAGE.DASHBOARD_VARIABLES);
	if (!raw) {
		return {};
	}
	try {
		return JSON.parse(raw);
	} catch {
		console.error('Failed to parse dashboard variables from local storage');
		return {};
	}
}

function writeAll(data: DashboardLocalStorageVariables): void {
	try {
		setLocalStorageKey(LOCALSTORAGE.DASHBOARD_VARIABLES, JSON.stringify(data));
	} catch {
		console.error('Failed to set dashboard variables in local storage');
	}
}

/** Read the saved variable selections for a dashboard from localStorage. */
export function getLocalStorageDashboardVariables(
	dashboardId: string,
): LocalStoreDashboardVariables {
	return readAll()[dashboardId] ?? {};
}

/**
 * Write one variable's selection for a dashboard to localStorage.
 * All call sites write to the same store with no React state coordination.
 */
export function updateLocalStorageDashboardVariable(
	dashboardId: string,
	id: string,
	selectedValue: IDashboardVariable['selectedValue'],
	allSelected: boolean,
	isDynamic?: boolean,
): void {
	const all = readAll();
	all[dashboardId] = {
		...(all[dashboardId] ?? {}),
		[id]:
			isDynamic && allSelected
				? {
						selectedValue:
							undefined as unknown as IDashboardVariable['selectedValue'],
						allSelected: true,
					}
				: { selectedValue, allSelected },
	};
	writeAll(all);
}
