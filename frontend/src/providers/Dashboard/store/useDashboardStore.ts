import type { Layout } from 'react-grid-layout';
import type { Dashboard } from 'types/api/dashboard/getAll';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
	createDashboardLayoutSlice,
	DashboardLayoutSlice,
	initialDashboardLayoutState,
} from './slices/dashboardLayoutSlice';
import {
	createDashboardUISlice,
	DashboardUISlice,
	initialDashboardUIState,
} from './slices/dashboardUISlice';

export type DashboardStore = DashboardUISlice &
	DashboardLayoutSlice & {
		resetDashboardStore: () => void;
	};

/**
 * 'select*' is a redux naming convention that can be carried over to zustand.
 * It is used to select a piece of state from the store.
 * In this case, we are selecting the locked state of the selected dashboard.
 * */
export const selectIsDashboardLocked = (s: DashboardStore): boolean =>
	s.selectedDashboard?.locked ?? false;

export const useDashboardStore = create<DashboardStore>()(
	immer((set, get, api) => ({
		...createDashboardUISlice(set, get, api),
		...createDashboardLayoutSlice(set, get, api),

		resetDashboardStore: (): void =>
			set((state: DashboardStore) => {
				Object.assign(state, initialDashboardUIState, initialDashboardLayoutState);
			}),
	})),
);

// Standalone imperative accessors — use these instead of calling useDashboardStore.getState() at call sites.
export const getSelectedDashboard = (): Dashboard | undefined =>
	useDashboardStore.getState().selectedDashboard;

export const getDashboardLayouts = (): Layout[] =>
	useDashboardStore.getState().layouts;

export const resetDashboard = (): void =>
	useDashboardStore.getState().resetDashboardStore();
