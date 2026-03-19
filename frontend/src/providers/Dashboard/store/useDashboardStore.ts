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
