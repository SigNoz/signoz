import type { StateCreator } from 'zustand';
import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';

import type { DashboardStore } from '../useDashboardStore';

// Re-exported so the leaf modules already importing the reasons from here (and
// from useDashboardEditGuard) don't all have to change at once.
export {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
};

// Edit context shared across the V2 dashboard tree, set once by DashboardContainer.
export interface EditContextSlice {
	dashboardId: string;
	// canEditDashboard && !isLocked.
	isEditable: boolean;
	isLocked: boolean;
	// read + update on this dashboard.
	canEditDashboard: boolean;
	// delete on this dashboard — independent of read/update.
	canDeleteDashboard: boolean;
	// The permission check is in flight; controls are disabled but show no reason.
	isPermissionLoading: boolean;
	// Locked / no-permission reason for tooltips; '' when editable or loading.
	editDisabledReason: string;
	deleteDisabledReason: string;
	refetch: () => void;
	setEditContext: (ctx: {
		dashboardId: string;
		isLocked: boolean;
		canEditDashboard: boolean;
		canDeleteDashboard: boolean;
		isPermissionLoading: boolean;
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
	canDeleteDashboard: false,
	isPermissionLoading: true,
	editDisabledReason: '',
	deleteDisabledReason: '',
	refetch: (): void => undefined,
	// Idempotent (no-op when unchanged) so it's safe to call during render.
	setEditContext: (ctx): void => {
		const isEditable = ctx.canEditDashboard && !ctx.isLocked;
		// Lock wins over permission: it's the thing an edit-capable user can act on.
		let editDisabledReason = '';
		let deleteDisabledReason = '';
		if (!ctx.isPermissionLoading) {
			if (ctx.isLocked) {
				editDisabledReason = DASHBOARD_LOCKED_REASON;
				deleteDisabledReason = DASHBOARD_LOCKED_REASON;
			} else {
				if (!ctx.canEditDashboard) {
					editDisabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
				}
				if (!ctx.canDeleteDashboard) {
					deleteDisabledReason = DASHBOARD_NO_DELETE_PERMISSION_REASON;
				}
			}
		}
		const prev = get();
		if (
			prev.dashboardId === ctx.dashboardId &&
			prev.isEditable === isEditable &&
			prev.isLocked === ctx.isLocked &&
			prev.canEditDashboard === ctx.canEditDashboard &&
			prev.canDeleteDashboard === ctx.canDeleteDashboard &&
			prev.isPermissionLoading === ctx.isPermissionLoading &&
			prev.refetch === ctx.refetch
		) {
			return;
		}
		set({
			dashboardId: ctx.dashboardId,
			isEditable,
			isLocked: ctx.isLocked,
			canEditDashboard: ctx.canEditDashboard,
			canDeleteDashboard: ctx.canDeleteDashboard,
			isPermissionLoading: ctx.isPermissionLoading,
			editDisabledReason,
			deleteDisabledReason,
			refetch: ctx.refetch,
		});
	},
});
