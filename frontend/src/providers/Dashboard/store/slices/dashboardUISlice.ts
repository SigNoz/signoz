import type { Dashboard } from 'types/api/dashboard/getAll';
import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

export type WidgetColumnWidths = {
	[widgetId: string]: Record<string, number>;
};

export interface DashboardUISlice {
	//
	dashboardData: Dashboard | undefined;
	setDashboardData: (
		updater:
			| Dashboard
			| undefined
			| ((prev: Dashboard | undefined) => Dashboard | undefined),
	) => void;
	//
	columnWidths: WidgetColumnWidths;
	setColumnWidths: (
		updater:
			| WidgetColumnWidths
			| ((prev: WidgetColumnWidths) => WidgetColumnWidths),
	) => void;
}

export const initialDashboardUIState = {
	dashboardData: undefined as Dashboard | undefined,
	columnWidths: {} as WidgetColumnWidths,
};

export const createDashboardUISlice: StateCreator<
	DashboardStore,
	[['zustand/immer', never]],
	[],
	DashboardUISlice
> = (set) => ({
	...initialDashboardUIState,

	setDashboardData: (updater): void =>
		set((state: DashboardUISlice): void => {
			state.dashboardData =
				typeof updater === 'function' ? updater(state.dashboardData) : updater;
		}),

	setColumnWidths: (updater): void =>
		set((state: DashboardUISlice): void => {
			state.columnWidths =
				typeof updater === 'function' ? updater(state.columnWidths) : updater;
		}),

	resetDashboardUI: (): void =>
		set((state: DashboardUISlice): void => {
			Object.assign(state, initialDashboardUIState);
		}),
});
