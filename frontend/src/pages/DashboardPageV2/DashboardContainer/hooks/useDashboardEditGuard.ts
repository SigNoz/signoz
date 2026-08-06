import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';

import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from '../store/slices/editContextSlice';

// Re-exported from the (dependency-light) slice so leaf modules / tests can import
// the reason strings without pulling this hook's provider chain.
export {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from '../store/slices/editContextSlice';

export interface DashboardEditGuard {
	isEditable: boolean;
	isLocked: boolean;
	canEditDashboard: boolean;
	canDeleteDashboard: boolean;
	isPermissionLoading: boolean;
	editDisabledReason: string;
	deleteDisabledReason: string;
}

// Editability + reason, derived from the dashboard (used where the store is cold,
// e.g. the panel-editor route reached by direct URL).
export function useDashboardEditGuard(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): DashboardEditGuard {
	const { canEdit, canDelete, isLoading } = useDashboardPermissions(
		dashboard?.id ?? '',
		{ enabled: !!dashboard?.id },
	);
	const isLocked = !!dashboard?.locked;

	// No reason while the check is in flight — controls are disabled but silent,
	// rather than briefly claiming a denial that may not hold.
	let editDisabledReason = '';
	let deleteDisabledReason = '';
	if (!isLoading) {
		if (isLocked) {
			editDisabledReason = DASHBOARD_LOCKED_REASON;
			deleteDisabledReason = DASHBOARD_LOCKED_REASON;
		} else {
			if (!canEdit) {
				editDisabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
			}
			if (!canDelete) {
				deleteDisabledReason = DASHBOARD_NO_DELETE_PERMISSION_REASON;
			}
		}
	}

	return {
		isEditable: canEdit && !isLocked,
		isLocked,
		canEditDashboard: canEdit,
		canDeleteDashboard: canDelete,
		isPermissionLoading: isLoading,
		editDisabledReason,
		deleteDisabledReason,
	};
}
