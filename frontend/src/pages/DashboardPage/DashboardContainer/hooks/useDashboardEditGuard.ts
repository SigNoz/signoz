import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';

import {
	type DashboardEditContext,
	deriveEditContext,
} from './dashboardEditContext';

export type { DashboardEditContext };

/**
 * Edit context for the two root pages, which hold the dashboard themselves and
 * mount before the subtree exists. Everything inside the subtree should use
 * `useDashboardEditContext`, which resolves the dashboard from the cache.
 */
export function useDashboardEditGuard(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): DashboardEditContext {
	const { canEdit, canDelete } = useDashboardPermissions(dashboard?.id ?? '', {
		enabled: !!dashboard?.id,
	});

	return deriveEditContext({
		isLocked: !!dashboard?.locked,
		canEdit,
		canDelete,
	});
}
