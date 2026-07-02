import { useMemo } from 'react';
import { useGetDashboardV2 } from 'api/generated/services/dashboard';

import { useDashboardStore } from '../store/useDashboardStore';
import { type DashboardSection, layoutsToSections } from '../utils';

/**
 * The current dashboard's sections, read from the already-loaded dashboard
 * query. The page fetches via useGetDashboardV2 keyed by id, so this reuses that
 * cache (no extra request) instead of prop-drilling the section list.
 */
export function useDashboardSections(): DashboardSection[] {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { data } = useGetDashboardV2({ id: dashboardId });
	const spec = data?.data?.spec;

	return useMemo(
		() => layoutsToSections(spec?.layouts, spec?.panels),
		[spec?.layouts, spec?.panels],
	);
}
