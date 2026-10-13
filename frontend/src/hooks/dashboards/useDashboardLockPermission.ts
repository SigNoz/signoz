import { useTranslation } from 'react-i18next';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { useDashboardPermissions } from './useDashboardPermissions';

export interface DashboardLockPermission {
	canToggleLock: boolean;
	isLoading: boolean;
	/** Non-permission obstacle only; empty when a permission is what's missing. */
	disabledTooltip: string;
}

/**
 * Needs `dashboard:update`, and the handler then rejects integration dashboards;
 * ownership is not a factor. It rejects system dashboards too, unchecked here
 * because the list query filters them out.
 */
export function useDashboardLockPermission({
	dashboardId,
	source,
	enabled = true,
}: {
	dashboardId: string;
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
		// Empty without `canEdit` so the missing permission surfaces instead.
		disabledTooltip:
			canEdit && !isLockable ? t('lock_integration_dashboard') : '',
	};
}
