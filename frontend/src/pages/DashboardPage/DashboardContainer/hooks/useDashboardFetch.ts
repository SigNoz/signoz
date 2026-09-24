import {
	getDashboardV2,
	useGetDashboardV2,
} from 'api/generated/services/dashboard';
import type { GetDashboardV2QueryError } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

// Instantiation expression pins `TData`/`TError` to the hook's defaults; a plain
// `ReturnType<typeof useGetDashboardV2>` collapses the generics to `unknown`.
type GetDashboardV2Query = ReturnType<
	typeof useGetDashboardV2<
		Awaited<ReturnType<typeof getDashboardV2>>,
		GetDashboardV2QueryError
	>
>;

export interface UseDashboardFetchResult {
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined;
	isLoading: GetDashboardV2Query['isLoading'];
	isError: GetDashboardV2Query['isError'];
	error: GetDashboardV2Query['error'];
	refetch: GetDashboardV2Query['refetch'];
}

/**
 * Canonical fetch-only loader for a V2 dashboard by id — shared so the page, panel
 * editor, and config sections resolve to one react-query cache entry. Exposes just the
 * raw `dashboard` plus lifecycle; spec derivation (e.g. `variables`) lives in
 * `useDashboardFetchRequired`, where the dashboard is guaranteed present.
 */
export function useDashboardFetch(
	dashboardId: string,
): UseDashboardFetchResult {
	const { data, isLoading, isError, error, refetch } = useGetDashboardV2(
		{ id: dashboardId },
		{
			// The spec is kept fresh in-cache by optimistic patches (useOptimisticPatch),
			// so never auto-refetch: it would flash the grid back to server state as
			// observers mount across the panel tree. Explicit refetch() still works.
			query: { staleTime: Infinity, refetchOnMount: false },
		},
	);
	const dashboard = data?.data;

	return { dashboard, isLoading, isError, error, refetch };
}
