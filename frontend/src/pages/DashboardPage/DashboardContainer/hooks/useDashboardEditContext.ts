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
 * Edit context for components inside a loaded dashboard subtree.
 *
 * Mirrors `useDashboardFetchRequired`: the dashboard comes from the shared
 * react-query cache and the permissions from the shared authz cache, both keyed
 * off the store's `dashboardId`. Nothing derived is stored — react-query already
 * dedupes, so a copy in zustand would only be a second source of truth to keep
 * in step.
 */
export function useDashboardEditContext(): DashboardEditContext {
	const { dashboard } = useDashboardFetchRequired();
	const {
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
