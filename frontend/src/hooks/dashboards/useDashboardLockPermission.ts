import { useTranslation } from 'react-i18next';
import { useIsOrgAdmin } from 'lib/authz/hooks/useIsOrgAdmin';
import { useAppContext } from 'providers/App/App';

import { useDashboardPermissions } from './useDashboardPermissions';

export interface DashboardLockPermission {
	canToggleLock: boolean;
	isLoading: boolean;
	/**
	 * The non-permission obstacle only — not the creator or an org admin. Empty
	 * when the toggle is allowed, still
	 * resolving, or blocked by a missing permission: `update` outranks both of
	 * these, and the authz component reports it in the standard wording.
	 */
	disabledTooltip: string;
}

/**
 * Lock/unlock needs `dashboard:update` plus a handler-side creator-or-admin check.
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
	const { t } = useTranslation('dashboard');
	const { user } = useAppContext();
	const { canEdit, areOtherPermissionsLoading } = useDashboardPermissions(
		dashboardId,
		{ enabled },
	);
	const { isOrgAdmin, isLoading: isAdminLoading } = useIsOrgAdmin({ enabled });

	const isLoading = areOtherPermissionsLoading || isAdminLoading;
	const isAuthor = !!createdBy && user?.email === createdBy;

	const canToggleLock = !isLoading && canEdit && (isAuthor || isOrgAdmin);

	// Left empty when `canEdit` is false so the missing permission surfaces
	// instead: telling someone the dashboard is integration-owned points them at
	// the wrong thing when what they lack is access.
	let disabledTooltip = '';
	if (!isLoading && canEdit && !canToggleLock) {
		disabledTooltip = t('lock_not_owner');
	}

	return { canToggleLock, isLoading, disabledTooltip };
}
