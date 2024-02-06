import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTo } from 'lodash-es';
import { useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

interface LocalStoreDashboardVariables {
	[id: string]: {
		selectedValue: IDashboardVariable['selectedValue'];
		allSelected: boolean;
	};
}
interface DashboardLocalStorageVariables {
	[id: string]: LocalStoreDashboardVariables;
}

interface UseDashboardVariablesFromLocalStorageReturn {
	currentDashboard: LocalStoreDashboardVariables;
	updateLocalStorageDashboardVariables: (
		id: string,
		selectedValue: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
}

export const useDashboardVariablesFromLocalStorage = (
	dashboardId: string,
): UseDashboardVariablesFromLocalStorageReturn => {
	const [
		allDashboards,
		setAllDashboards,
	] = useState<DashboardLocalStorageVariables>({});

	const [
		currentDashboard,
		setCurrentDashboard,
	] = useState<LocalStoreDashboardVariables>({});

	useEffect(() => {
		const localStoreDashboardVariablesString = getLocalStorageKey(
			LOCALSTORAGE.DASHBOARD_VARIABLES,
		);
		let localStoreDashboardVariables: DashboardLocalStorageVariables = {};
		if (localStoreDashboardVariablesString === null) {
			try {
				const serialzedData = JSON.stringify({
					[dashboardId]: {},
				});

				setLocalStorageKey(LOCALSTORAGE.DASHBOARD_VARIABLES, serialzedData);
			} catch {
				console.error('Failed to seralise the data');
			}
		} else {
			try {
				localStoreDashboardVariables = JSON.parse(
					localStoreDashboardVariablesString,
				);
			} catch {
				console.error('Failed to parse dashboards from local storage');
				localStoreDashboardVariables = {};
			} finally {
				setAllDashboards(localStoreDashboardVariables);
			}
		}
		setCurrentDashboard(defaultTo(localStoreDashboardVariables[dashboardId], {}));
	}, [dashboardId]);

	const updateLocalStorageDashboardVariables = (
		id: string,
		selectedValue: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	): void => {
		const newCurrentDashboard = {
			...currentDashboard,
			[id]: { selectedValue, allSelected },
		};

		const newAllDashboards = {
			...allDashboards,
			[dashboardId]: newCurrentDashboard,
		};

		try {
			const serializedData = JSON.stringify(newAllDashboards);
			setLocalStorageKey(LOCALSTORAGE.DASHBOARD_VARIABLES, serializedData);
		} catch {
			console.error('Failed to set dashboards in local storage');
		}

		setAllDashboards(newAllDashboards);
		setCurrentDashboard(newCurrentDashboard);
	};

	return {
		currentDashboard,
		updateLocalStorageDashboardVariables,
	};
};
