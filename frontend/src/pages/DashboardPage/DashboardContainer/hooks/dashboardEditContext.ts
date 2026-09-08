import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_READ_ONLY_VIEW_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

export interface DashboardEditContext {
	isEditable: boolean;
	isLocked: boolean;
	canEditDashboard: boolean;
	canDeleteDashboard: boolean;
	/** `[read, update]` — hand to an authz component as its `checks`. */
	editChecks: BrandedPermission[];
	deleteChecks: BrandedPermission[];
	/**
	 * The non-permission obstacle, for `disabledTooltip`. Empty when a missing
	 * permission is the obstacle: `update` outranks the lock, so the authz
	 * component reports it in the standard wording instead.
	 */
	editDisabledTooltip: string;
	deleteDisabledTooltip: string;
	/** `update`/`delete` are still resolving; `read` gates the page itself. */
	areOtherPermissionsLoading: boolean;
}

/**
 * Precedence is `update` → lock → `read`: a caller who lacks the permission
 * hears that, since telling them the dashboard is locked would send them asking
 * for an unlock when what they need is access. A caller who holds it hears about
 * the lock, which is the thing they can act on.
 *
 * A forced read-only mount outranks both — it is not a permission problem and no
 * check can lift it.
 */
export function deriveEditContext({
	isLocked,
	canEdit,
	canDelete,
	editChecks,
	deleteChecks,
	areOtherPermissionsLoading,
	readOnlyOverride = false,
}: {
	isLocked: boolean;
	canEdit: boolean;
	canDelete: boolean;
	editChecks: BrandedPermission[];
	deleteChecks: BrandedPermission[];
	areOtherPermissionsLoading: boolean;
	/** Mount forced view-only regardless of permissions (see pulse-pod#283). */
	readOnlyOverride?: boolean;
}): DashboardEditContext {
	if (readOnlyOverride) {
		return {
			isEditable: false,
			isLocked,
			canEditDashboard: false,
			canDeleteDashboard: false,
			editChecks,
			deleteChecks,
			editDisabledTooltip: DASHBOARD_READ_ONLY_VIEW_REASON,
			deleteDisabledTooltip: DASHBOARD_READ_ONLY_VIEW_REASON,
			areOtherPermissionsLoading: false,
		};
	}

	return {
		isEditable: canEdit && !isLocked,
		isLocked,
		canEditDashboard: canEdit,
		canDeleteDashboard: canDelete,
		editChecks,
		deleteChecks,
		editDisabledTooltip: canEdit && isLocked ? DASHBOARD_LOCKED_REASON : '',
		deleteDisabledTooltip: canDelete && isLocked ? DASHBOARD_LOCKED_REASON : '',
		areOtherPermissionsLoading,
	};
}
