import { useIsOrgAdmin } from 'lib/authz/hooks/useIsOrgAdmin';
import { useAppContext } from 'providers/App/App';

import {
	DASHBOARD_LOCK_INTEGRATION_REASON,
	DASHBOARD_LOCK_NOT_OWNER_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from './dashboardPermissionReasons';
import { useDashboardPermissions } from './useDashboardPermissions';

export interface DashboardLockPermission {
	canToggleLock: boolean;
	isLoading: boolean;
	/** '' while loading or when the toggle is allowed. */
	disabledReason: string;
	/**
	 * Whether the reason is an access problem or a state of the dashboard.
	 * Access is checked first, so a missing permission is reported as such even
	 * on an integration-owned dashboard.
	 */
	disabledKind: 'denied' | 'blocked';
}

/**
 * Lock/unlock needs `dashboard:update` plus a handler-side creator-or-admin check,
 * and integration-owned dashboards are never toggleable.
 */
export function useDashboardLockPermission({
	dashboardId,
	createdBy,
	enabled = true,
}: {
	dashboardId: string;
	createdBy: string | undefined;
	enabled?: boolean;
}): DashboardLockPermission {
	const { user } = useAppContext();
	const { canEdit, isLoading: isEditLoading } = useDashboardPermissions(
		dashboardId,
		{ enabled },
	);
	const { isOrgAdmin, isLoading: isAdminLoading } = useIsOrgAdmin({ enabled });

	const isLoading = isEditLoading || isAdminLoading;
	const isAuthor = !!createdBy && user?.email === createdBy;
	const isIntegrationOwned = createdBy === 'integration';

	const canToggleLock =
		!isLoading && !isIntegrationOwned && canEdit && (isAuthor || isOrgAdmin);

	// Access first: if the caller can't edit, or isn't the creator or an org
	// admin, that's what they need to hear - saying the dashboard is
	// integration-owned would point them at the wrong thing.
	let disabledReason = '';
	let disabledKind: 'denied' | 'blocked' = 'denied';
	if (!isLoading && !canToggleLock) {
		if (!canEdit) {
			disabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
		} else if (!isAuthor && !isOrgAdmin) {
			disabledReason = DASHBOARD_LOCK_NOT_OWNER_REASON;
		} else {
			disabledReason = DASHBOARD_LOCK_INTEGRATION_REASON;
			disabledKind = 'blocked';
		}
	}

	return { canToggleLock, isLoading, disabledReason, disabledKind };
}
