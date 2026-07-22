import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

export const DASHBOARD_LOCKED_REASON = 'This dashboard is locked';
export const DASHBOARD_NO_EDIT_PERMISSION_REASON =
	'You don’t have permission to edit this dashboard';

// Edit context shared across the V2 dashboard tree, set once by DashboardContainer.
export interface EditContextSlice {
	dashboardId: string;
	// canEditDashboard && !isLocked.
	isEditable: boolean;
	isLocked: boolean;
	canEditDashboard: boolean;
	// Locked / no-permission reason for tooltips; '' when editable.
	editDisabledReason: string;
	refetch: () => void;
	setEditContext: (ctx: {
		dashboardId: string;
		isLocked: boolean;
		canEditDashboard: boolean;
		refetch: () => void;
	}) => void;
}

export const createEditContextSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	EditContextSlice
> = (set, get) => ({
	dashboardId: '',
	isEditable: false,
	isLocked: false,
	canEditDashboard: false,
	editDisabledReason: '',
	refetch: (): void => undefined,
	// Idempotent (no-op when unchanged) so it's safe to call during render.
	setEditContext: (ctx): void => {
		const isEditable = ctx.canEditDashboard && !ctx.isLocked;
		let editDisabledReason = '';
		if (ctx.isLocked) {
			editDisabledReason = DASHBOARD_LOCKED_REASON;
		} else if (!ctx.canEditDashboard) {
			editDisabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
		}
		const prev = get();
		if (
			prev.dashboardId === ctx.dashboardId &&
			prev.isEditable === isEditable &&
			prev.isLocked === ctx.isLocked &&
			prev.canEditDashboard === ctx.canEditDashboard &&
			prev.refetch === ctx.refetch
		) {
			return;
		}
		set({
			dashboardId: ctx.dashboardId,
			isEditable,
			isLocked: ctx.isLocked,
			canEditDashboard: ctx.canEditDashboard,
			editDisabledReason,
			refetch: ctx.refetch,
		});
	},
});
