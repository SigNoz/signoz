import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from '../store/slices/editContextSlice';

// Re-exported from the (dependency-light) slice so leaf modules / tests can import
// the reason strings without pulling this hook's provider chain.
export {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from '../store/slices/editContextSlice';

export interface DashboardEditGuard {
	isEditable: boolean;
	isLocked: boolean;
	canEditDashboard: boolean;
	editDisabledReason: string;
}

// Editability + reason, derived from the dashboard (used where the store is cold,
// e.g. the panel-editor route reached by direct URL).
export function useDashboardEditGuard(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): DashboardEditGuard {
	const { user } = useAppContext();
	const [editDashboardPermission] = useComponentPermission(
		['edit_dashboard'],
		user.role,
	);
	const canEditDashboard = !!editDashboardPermission;
	const isLocked = !!dashboard?.locked;
	let editDisabledReason = '';
	if (isLocked) {
		editDisabledReason = DASHBOARD_LOCKED_REASON;
	} else if (!canEditDashboard) {
		editDisabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
	}
	return {
		isEditable: canEditDashboard && !isLocked,
		isLocked,
		canEditDashboard,
		editDisabledReason,
	};
}
