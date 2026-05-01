import { useCallback, useSyncExternalStore } from 'react';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

// Per-dashboard preferences persisted in localStorage. Add new preference
// fields here as they are introduced.
export type DashboardPreferences = {
	cursorSyncMode?: DashboardCursorSync;
};

type DashboardPreferencesStore = Record<string, DashboardPreferences>;

const subscribers = new Set<() => void>();

const subscribe = (callback: () => void): (() => void) => {
	subscribers.add(callback);
	return (): void => {
		subscribers.delete(callback);
	};
};

const notify = (): void => {
	subscribers.forEach((cb) => cb());
};

if (typeof window !== 'undefined') {
	window.addEventListener('storage', (event) => {
		if (event.key === LOCALSTORAGE.DASHBOARD_PREFERENCES) {
			notify();
		}
	});
}

const readStore = (): DashboardPreferencesStore => {
	try {
		const raw = getLocalStorageApi(LOCALSTORAGE.DASHBOARD_PREFERENCES);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') {
				return parsed as DashboardPreferencesStore;
			}
		}
	} catch (error) {
		console.warn(
			`Error reading localStorage key "${LOCALSTORAGE.DASHBOARD_PREFERENCES}":`,
			error,
		);
	}
	return {};
};

const writeStore = (store: DashboardPreferencesStore): void => {
	try {
		setLocalStorageApi(LOCALSTORAGE.DASHBOARD_PREFERENCES, JSON.stringify(store));
	} catch (error) {
		console.warn(
			`Error writing localStorage key "${LOCALSTORAGE.DASHBOARD_PREFERENCES}":`,
			error,
		);
	}
};

const readPreference = <K extends keyof DashboardPreferences>(
	dashboardId: string | undefined,
	key: K,
): DashboardPreferences[K] | undefined => {
	if (!dashboardId) {
		return undefined;
	}
	return readStore()[dashboardId]?.[key];
};

export function useDashboardPreference<K extends keyof DashboardPreferences>(
	dashboardId: string | undefined,
	key: K,
	defaultValue: NonNullable<DashboardPreferences[K]>,
): [
	NonNullable<DashboardPreferences[K]>,
	(value: NonNullable<DashboardPreferences[K]>) => void,
] {
	type Value = NonNullable<DashboardPreferences[K]>;

	const getSnapshot = useCallback(
		(): Value =>
			(readPreference(dashboardId, key) as Value | undefined) ?? defaultValue,
		[dashboardId, key, defaultValue],
	);

	const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const updateValue = useCallback(
		(next: Value) => {
			if (!dashboardId) {
				return;
			}
			const store = readStore();
			store[dashboardId] = { ...store[dashboardId], [key]: next };
			writeStore(store);
			notify();
		},
		[dashboardId, key],
	);

	return [value, updateValue];
}
