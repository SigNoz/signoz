import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_READ_ONLY_VIEW_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';

export interface DashboardEditContext {
	isEditable: boolean;
	isLocked: boolean;
	canEditDashboard: boolean;
	canDeleteDashboard: boolean;
	/** '' when the action is available. */
	editDisabledReason: string;
	deleteDisabledReason: string;
	/**
	 * Whether each reason is an access problem or a state the user can act on.
	 * Drives how it is presented; meaningless when the reason is ''. Delete has
	 * its own, since it is gated independently of edit.
	 */
	editDisabledKind: 'denied' | 'blocked';
	deleteDisabledKind: 'denied' | 'blocked';
}

/**
 * Lock wins over permission: an edit-capable user looking at a locked dashboard
 * should be told about the lock, which is the thing they can act on.
 */
export function deriveEditContext({
	isLocked,
	canEdit,
	canDelete,
	readOnlyOverride = false,
}: {
	isLocked: boolean;
	canEdit: boolean;
	canDelete: boolean;
	/** Mount forced view-only regardless of permissions (see pulse-pod#283). */
	readOnlyOverride?: boolean;
}): DashboardEditContext {
	let editDisabledReason = '';
	let deleteDisabledReason = '';
	if (readOnlyOverride) {
		return {
			editDisabledKind: 'blocked',
			deleteDisabledKind: 'blocked',
			isEditable: false,
			isLocked,
			canEditDashboard: false,
			canDeleteDashboard: false,
			editDisabledReason: DASHBOARD_READ_ONLY_VIEW_REASON,
			deleteDisabledReason: DASHBOARD_READ_ONLY_VIEW_REASON,
		};
	}
	// Access before state: someone who lacks the permission needs to hear that,
	// not that the dashboard is locked - otherwise they go asking for an unlock
	// when what they need is access. An edit-capable user still gets the lock,
	// which is the thing they can act on.
	if (!canEdit) {
		editDisabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
	} else if (isLocked) {
		editDisabledReason = DASHBOARD_LOCKED_REASON;
	}
	if (!canDelete) {
		deleteDisabledReason = DASHBOARD_NO_DELETE_PERMISSION_REASON;
	} else if (isLocked) {
		deleteDisabledReason = DASHBOARD_LOCKED_REASON;
	}

	return {
		// Each reason above is a permission message unless access was fine and the
		// lock is the only obstacle.
		editDisabledKind: canEdit && isLocked ? 'blocked' : 'denied',
		deleteDisabledKind: canDelete && isLocked ? 'blocked' : 'denied',
		isEditable: canEdit && !isLocked,
		isLocked,
		canEditDashboard: canEdit,
		canDeleteDashboard: canDelete,
		editDisabledReason,
		deleteDisabledReason,
	};
}
