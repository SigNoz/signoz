import type { Layout } from 'react-grid-layout';
import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

export interface DashboardLayoutSlice {
	//
	layouts: Layout[];
	setLayouts: (updater: Layout[] | ((prev: Layout[]) => Layout[])) => void;
	//
	panelMap: Record<string, { widgets: Layout[]; collapsed: boolean }>;
	setPanelMap: (
		updater:
			| Record<string, { widgets: Layout[]; collapsed: boolean }>
			| ((
					prev: Record<string, { widgets: Layout[]; collapsed: boolean }>,
			  ) => Record<string, { widgets: Layout[]; collapsed: boolean }>),
	) => void;
	// resetDashboardLayout: () => void;
}

export const initialDashboardLayoutState = {
	layouts: [] as Layout[],
	panelMap: {} as Record<string, { widgets: Layout[]; collapsed: boolean }>,
};

export const createDashboardLayoutSlice: StateCreator<
	DashboardStore,
	[['zustand/immer', never]],
	[],
	DashboardLayoutSlice
> = (set) => ({
	...initialDashboardLayoutState,

	setLayouts: (updater): void =>
		set((state) => {
			state.layouts =
				typeof updater === 'function' ? updater(state.layouts) : updater;
		}),

	setPanelMap: (updater): void =>
		set((state) => {
			state.panelMap =
				typeof updater === 'function' ? updater(state.panelMap) : updater;
		}),

	// resetDashboardLayout: () =>
	// 	set((state) => {
	// 		Object.assign(state, initialDashboardLayoutState);
	// 	}),
});
