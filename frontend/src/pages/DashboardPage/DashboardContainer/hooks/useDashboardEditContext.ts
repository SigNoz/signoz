import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';

import { useDashboardStore } from '../store/useDashboardStore';

import {
	type DashboardEditContext,
	deriveEditContext,
} from './dashboardEditContext';
import { useDashboardFetchRequired } from './useDashboardFetchRequired';

/**
 * Edit context for components inside a loaded dashboard subtree. The dashboard
 * and the permissions come from their shared caches, keyed off the store's
 * `dashboardId`; nothing derived is stored, to avoid a second source of truth.
 */
export function useDashboardEditContext(): DashboardEditContext {
	const { dashboard } = useDashboardFetchRequired();
	const {
		canRead,
		canEdit,
		canDelete,
		editChecks,
		deletePermission,
		areOtherPermissionsLoading,
	} = useDashboardPermissions(dashboard.id);
	const { t } = useTranslation('dashboard');
	const readOnlyOverride = useDashboardStore(
		(s) => s.canEditDashboardOverride === false,
	);

	const deleteChecks = useMemo(() => [deletePermission], [deletePermission]);

	return deriveEditContext({
		isLocked: !!dashboard.locked,
		canRead,
		canEdit,
		canDelete,
		editChecks,
		deleteChecks,
		areOtherPermissionsLoading,
		reasons: {
			locked: t('dashboard_locked'),
			readOnly: t('dashboard_read_only_here'),
		},
		readOnlyOverride,
	});
}
