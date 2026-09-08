import { useTranslation } from 'react-i18next';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { useDashboardPermissions } from './useDashboardPermissions';

export interface DashboardLockPermission {
	canToggleLock: boolean;
	isLoading: boolean;
	/**
	 * The non-permission obstacle only: an integration dashboard. Empty while
	 * resolving, when the toggle is allowed, or when a missing permission is the
	 * obstacle — `update` outranks it, and the authz component words that itself.
	 */
	disabledTooltip: string;
}

/**
 * Lock/unlock needs `dashboard:update`, and the handler then rejects integration
 * dashboards. Who created the dashboard does not come into it: access is decided
 * by the caller's role, not by ownership.
 *
 * The handler also rejects system dashboards, which is not checked here — the
 * list query filters them out, so none reaches the UI.
 */
export function useDashboardLockPermission({
	dashboardId,
	source,
	enabled = true,
}: {
	dashboardId: string;
	/** An integration dashboard can never be locked or unlocked. */
	source: DashboardtypesSourceDTO;
	enabled?: boolean;
}): DashboardLockPermission {
	const { t } = useTranslation('dashboard');
	const { canEdit, areOtherPermissionsLoading } = useDashboardPermissions(
		dashboardId,
		{ enabled },
	);

	const isLockable = source !== DashboardtypesSourceDTO.integration;

	return {
		canToggleLock: !areOtherPermissionsLoading && isLockable && canEdit,
		isLoading: areOtherPermissionsLoading,
		// Left empty when `canEdit` is false so the missing permission surfaces
		// instead: naming the source points the caller at the wrong thing when
		// what they lack is access.
		disabledTooltip:
			canEdit && !isLockable ? t('lock_integration_dashboard') : '',
	};
}
