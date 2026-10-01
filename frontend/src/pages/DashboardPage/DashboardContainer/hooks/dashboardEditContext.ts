import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

/** Copy for the two non-permission blocks, resolved by the caller so this stays pure. */
export interface EditContextReasons {
	locked: string;
	readOnly: string;
}

export interface DashboardEditContext {
	isEditable: boolean;
	isLocked: boolean;
	canReadDashboard: boolean;
	canEditDashboard: boolean;
	canDeleteDashboard: boolean;
	/** `[read, update]`, for an authz component's `checks`. */
	editChecks: BrandedPermission[];
	deleteChecks: BrandedPermission[];
	/** Non-permission obstacle for `disabledTooltip`; empty when a permission is what's missing. */
	editDisabledTooltip: string;
	deleteDisabledTooltip: string;
	/** `update`/`delete` are still resolving; `read` gates the page itself. */
	areOtherPermissionsLoading: boolean;
}

/**
 * Precedence is `update` → lock → `read`: the lock is only reported to a caller
 * who holds `update` and can act on it. A forced read-only mount outranks both,
 * since no check can lift it.
 */
export function deriveEditContext({
	isLocked,
	canRead,
	canEdit,
	canDelete,
	editChecks,
	deleteChecks,
	areOtherPermissionsLoading,
	reasons,
	readOnlyOverride = false,
}: {
	isLocked: boolean;
	canRead: boolean;
	canEdit: boolean;
	canDelete: boolean;
	editChecks: BrandedPermission[];
	deleteChecks: BrandedPermission[];
	areOtherPermissionsLoading: boolean;
	reasons: EditContextReasons;
	/** Mount forced view-only regardless of permissions (see pulse-pod#283). */
	readOnlyOverride?: boolean;
}): DashboardEditContext {
	if (readOnlyOverride) {
		return {
			isEditable: false,
			isLocked,
			canReadDashboard: canRead,
			canEditDashboard: false,
			canDeleteDashboard: false,
			editChecks,
			deleteChecks,
			editDisabledTooltip: reasons.readOnly,
			deleteDisabledTooltip: reasons.readOnly,
			areOtherPermissionsLoading: false,
		};
	}

	return {
		isEditable: canEdit && !isLocked,
		isLocked,
		canReadDashboard: canRead,
		canEditDashboard: canEdit,
		canDeleteDashboard: canDelete,
		editChecks,
		deleteChecks,
		editDisabledTooltip: canEdit && isLocked ? reasons.locked : '',
		deleteDisabledTooltip: canDelete && isLocked ? reasons.locked : '',
		areOtherPermissionsLoading,
	};
}
