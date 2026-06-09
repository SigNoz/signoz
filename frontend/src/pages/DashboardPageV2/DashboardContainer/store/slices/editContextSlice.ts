import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

/**
 * Edit context shared across the V2 dashboard tree — the dashboard id, whether
 * the user can edit, and the react-query refetch. Set once by DashboardContainer
 * so hooks/components read it from the store instead of receiving it as props
 * through every layer. Not persisted.
 */
export interface EditContextSlice {
	dashboardId: string;
	isEditable: boolean;
	refetch: () => void;
	setEditContext: (ctx: {
		dashboardId: string;
		isEditable: boolean;
		refetch: () => void;
	}) => void;
}

export const createEditContextSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	EditContextSlice
> = (set) => ({
	dashboardId: '',
	isEditable: false,
	refetch: (): void => undefined,
	setEditContext: (ctx): void => {
		set({
			dashboardId: ctx.dashboardId,
			isEditable: ctx.isEditable,
			refetch: ctx.refetch,
		});
	},
});
