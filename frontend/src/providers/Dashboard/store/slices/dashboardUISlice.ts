import type { Dayjs } from 'dayjs';
import type { Dashboard } from 'types/api/dashboard/getAll';
import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

export type WidgetColumnWidths = {
	[widgetId: string]: Record<string, number>;
};

export interface DashboardUISlice {
	//
	selectedDashboard: Dashboard | undefined;
	setSelectedDashboard: (
		updater:
			| Dashboard
			| undefined
			| ((prev: Dashboard | undefined) => Dashboard | undefined),
	) => void;
	//
	dashboardQueryRangeCalled: boolean;
	setDashboardQueryRangeCalled: (v: boolean) => void;
	//
	isDashboardFetching: boolean;
	setIsDashboardFetching: (v: boolean) => void;
	//
	columnWidths: WidgetColumnWidths;
	setColumnWidths: (
		updater:
			| WidgetColumnWidths
			| ((prev: WidgetColumnWidths) => WidgetColumnWidths),
	) => void;
	//
	updatedTime: Dayjs | null;
	setUpdatedTime: (t: Dayjs | null) => void;
	// resetDashboardUI: () => void;

	// updateLocalStorageDashboardVariables
	// dashboardResponse
	// updatedTimeRef
}

export const initialDashboardUIState = {
	selectedDashboard: undefined as Dashboard | undefined,
	isDashboardLocked: false,
	isDashboardSliderOpen: false,
	dashboardQueryRangeCalled: false,
	isDashboardFetching: false,
	columnWidths: {} as WidgetColumnWidths,
	updatedTime: null as Dayjs | null,
};

export const createDashboardUISlice: StateCreator<
	DashboardStore,
	[['zustand/immer', never]],
	[],
	DashboardUISlice
> = (set) => ({
	...initialDashboardUIState,

	setSelectedDashboard: (updater): void =>
		set((state: DashboardUISlice): void => {
			state.selectedDashboard =
				typeof updater === 'function' ? updater(state.selectedDashboard) : updater;
		}),

	setIsDashboardLocked: (v: boolean): void =>
		set((state: DashboardUISlice): void => {
			if (state.selectedDashboard) {
				state.selectedDashboard.locked = v;
			}
		}),

	setDashboardQueryRangeCalled: (v): void =>
		set((state: DashboardUISlice): void => {
			state.dashboardQueryRangeCalled = v;
		}),

	setIsDashboardFetching: (v): void =>
		set((state: DashboardUISlice): void => {
			state.isDashboardFetching = v;
		}),

	setColumnWidths: (updater): void =>
		set((state: DashboardUISlice): void => {
			state.columnWidths =
				typeof updater === 'function' ? updater(state.columnWidths) : updater;
		}),

	setUpdatedTime: (t: Dayjs | null): void =>
		set((state: DashboardUISlice): void => {
			state.updatedTime = t;
		}),

	resetDashboardUI: (): void =>
		set((state: DashboardUISlice): void => {
			Object.assign(state, initialDashboardUIState);
		}),
});
