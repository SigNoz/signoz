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

	let disabledReason = '';
	if (!isLoading && !canToggleLock) {
		if (isIntegrationOwned) {
			disabledReason = DASHBOARD_LOCK_INTEGRATION_REASON;
		} else if (!canEdit) {
			disabledReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
		} else {
			disabledReason = DASHBOARD_LOCK_NOT_OWNER_REASON;
		}
	}

	return { canToggleLock, isLoading, disabledReason };
}
