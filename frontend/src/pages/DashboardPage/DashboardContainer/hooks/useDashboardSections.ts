import { useMemo } from 'react';
import { type DashboardSection, layoutsToSections } from '../utils';
import { useDashboardFetchRequired } from './useDashboardFetchRequired';

/**
 * The current dashboard's sections, derived from the guaranteed-loaded dashboard
 * via useDashboardFetchRequired. That reuses the shared react-query cache (no extra
 * request) instead of prop-drilling the section list.
 */
export function useDashboardSections(): DashboardSection[] {
	const { dashboard } = useDashboardFetchRequired();
	const spec = dashboard.spec;

	return useMemo(
		() => layoutsToSections(spec.layouts, spec.panels),
		[spec.layouts, spec.panels],
	);
}
