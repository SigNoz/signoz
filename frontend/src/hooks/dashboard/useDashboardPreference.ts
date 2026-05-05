import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';

// Per-dashboard preferences persisted in localStorage. Add new preference
// fields here as they are introduced.
export type DashboardPreferences = {
	cursorSyncMode?: DashboardCursorSync;
	syncTooltipFilterMode?: SyncTooltipFilterMode;
};

interface DashboardPreferencesState {
	preferences: Record<string, DashboardPreferences>;
	setPreference: <K extends keyof DashboardPreferences>(
		dashboardId: string,
		key: K,
		value: NonNullable<DashboardPreferences[K]>,
	) => void;
	removePreferences: (dashboardId: string) => void;
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>()(
	persist(
		(set) => ({
			preferences: {},
			setPreference: (dashboardId, key, value): void => {
				set((state) => ({
					preferences: {
						...state.preferences,
						[dashboardId]: {
							...state.preferences[dashboardId],
							[key]: value,
						},
					},
				}));
			},
			removePreferences: (dashboardId): void => {
				set((state) => {
					if (!(dashboardId in state.preferences)) {
						return state;
					}
					const { [dashboardId]: _, ...rest } = state.preferences;
					return { preferences: rest };
				});
			},
		}),
		{ name: LOCALSTORAGE.DASHBOARD_PREFERENCES },
	),
);

export function useDashboardPreference<K extends keyof DashboardPreferences>(
	dashboardId: string | undefined,
	key: K,
	defaultValue: NonNullable<DashboardPreferences[K]>,
): [
	NonNullable<DashboardPreferences[K]>,
	(value: NonNullable<DashboardPreferences[K]>) => void,
] {
	type Value = NonNullable<DashboardPreferences[K]>;

	const value = useDashboardPreferencesStore((state): Value => {
		if (!dashboardId) {
			return defaultValue;
		}
		return (
			(state.preferences[dashboardId]?.[key] as Value | undefined) ?? defaultValue
		);
	});

	const setPreference = useDashboardPreferencesStore((s) => s.setPreference);

	const updateValue = useCallback(
		(next: Value): void => {
			if (!dashboardId) {
				return;
			}
			setPreference(dashboardId, key, next);
		},
		[dashboardId, key, setPreference],
	);

	return [value, updateValue];
}
