import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { getGetDashboardV2QueryKey } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesVariableDTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

export interface UseDashboardFetchRequiredResult {
	/** Guaranteed present — the hook throws otherwise. */
	dashboard: DashboardtypesGettableDashboardV2DTO;
	/** Always an array, so callers skip `?? []` guards. */
	variables: DashboardtypesVariableDTO[];
	refetch: () => void;
}

const selectDashboardV2 = (
	response: GetDashboardV2200,
): DashboardtypesGettableDashboardV2DTO => response.data;

/**
 * Dashboard accessor for components rendered inside a loaded dashboard subtree. The
 * root owns the fetch and publishes where it cached the dashboard
 * (`dashboardQuerySource`); this observes that entry without fetching, and throws if
 * it's empty — turning a silent `undefined` into a loud programmer error. It also
 * derives spec collections (`variables`) since the dashboard is guaranteed here.
 *
 * Prefer this over `useDashboardFetch` outside the two root pages; the
 * `signoz/no-dashboard-fetch-outside-root` lint rule enforces the split.
 */
export function useDashboardFetchRequired(): UseDashboardFetchRequiredResult {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const source = useDashboardStore((s) => s.dashboardQuerySource);
	const queryKey =
		source?.queryKey ?? getGetDashboardV2QueryKey({ id: dashboardId });
	const select = source?.select ?? selectDashboardV2;
	const refetch = useDashboardStore((s) => s.refetch);
	// Observe only: the root owns the request, so this never fetches.
	const { data: dashboard } = useQuery<
		unknown,
		unknown,
		DashboardtypesGettableDashboardV2DTO | undefined
	>({
		queryKey,
		select: select as (response: unknown) => DashboardtypesGettableDashboardV2DTO,
		enabled: false,
	});

	const variables = useMemo(
		() => dashboard?.spec?.variables ?? [],
		[dashboard?.spec?.variables],
	);

	if (!dashboard) {
		throw new Error(
			'useDashboardFetchRequired was used outside a loaded dashboard subtree — the ' +
				'dashboard is undefined. Only call it below a root page that gates rendering ' +
				'on its fetch and seeds the edit context (DashboardContainer / PanelEditorPage).',
		);
	}

	return { dashboard, variables, refetch };
}
