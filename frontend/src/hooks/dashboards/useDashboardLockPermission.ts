import { IsAdminPermission } from 'lib/authz/hooks/useAuthZ/legacy';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import {
	DASHBOARD_LOCK_INTEGRATION_REASON,
	DASHBOARD_LOCK_NOT_OWNER_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from './dashboardPermissionReasons';
import { useDashboardPermissions } from './useDashboardPermissions';

const ADMIN_CHECKS = [IsAdminPermission];

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
	const { permissions, isLoading: isAdminLoading } = useAuthZ(ADMIN_CHECKS, {
		enabled,
	});

	const isLoading = enabled && (isEditLoading || isAdminLoading);
	const isAdmin = permissions?.[IsAdminPermission]?.isGranted ?? false;
	const isAuthor = !!createdBy && user?.email === createdBy;
	const isIntegrationOwned = createdBy === 'integration';

	const canToggleLock =
		!isLoading && !isIntegrationOwned && canEdit && (isAuthor || isAdmin);

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
