import { useMemo } from 'react';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';

import { useDashboardFetch } from './useDashboardFetch';
import type { UseDashboardFetchResult } from './useDashboardFetch';

export interface UseDashboardFetchRequiredResult {
	/** Guaranteed present — the hook throws otherwise. */
	dashboard: DashboardtypesGettableDashboardV2DTO;
	/** Always an array, so callers skip `?? []` guards. */
	variables: DashboardtypesVariableDTO[];
	refetch: UseDashboardFetchResult['refetch'];
}

/**
 * Dashboard accessor for components rendered inside a loaded dashboard subtree. The
 * root pages own the fetch and gate on a resolved dashboard before mounting their
 * subtree, so this reuses the shared react-query cache entry and throws if the
 * dashboard is missing — turning a silent `undefined` into a loud programmer error. It
 * also derives spec collections (`variables`) since the dashboard is guaranteed here.
 *
 * Prefer this over `useDashboardFetch` outside the two root pages; the
 * `signoz/no-dashboard-fetch-outside-root` lint rule enforces the split.
 */
export function useDashboardFetchRequired(): UseDashboardFetchRequiredResult {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { dashboard, refetch } = useDashboardFetch(dashboardId);

	const variables = useMemo(
		() => dashboard?.spec?.variables ?? [],
		[dashboard?.spec?.variables],
	);

	if (!dashboard) {
		throw new Error(
			'useDashboardFetchRequired was used outside a loaded dashboard subtree — the ' +
				'dashboard is undefined. Only call it below a root page that gates rendering ' +
				'on useDashboardFetch (DashboardPageV2 / PanelEditorPage).',
		);
	}

	return { dashboard, variables, refetch };
}
