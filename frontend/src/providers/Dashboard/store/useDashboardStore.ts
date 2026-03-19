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
		reset: () => void;
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

		reset: (): void =>
			set((state: DashboardStore) => {
				Object.assign(state, initialDashboardUIState, initialDashboardLayoutState);
			}),
	})),
);
