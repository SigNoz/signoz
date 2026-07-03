import { useMemo } from 'react';
import {
	getDashboardV2,
	useGetDashboardV2,
} from 'api/generated/services/dashboard';
import type { GetDashboardV2QueryError } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Instantiation expression pins `TData`/`TError` to the hook's defaults.
 * `ReturnType<typeof useGetDashboardV2>` alone would resolve the unconstrained
 * generics to `unknown`, collapsing `data`/`error`/`refetch` — the defaults only
 * apply at call sites, not when extracting the type.
 */
type GetDashboardV2Query = ReturnType<
	typeof useGetDashboardV2<
		Awaited<ReturnType<typeof getDashboardV2>>,
		GetDashboardV2QueryError
	>
>;

export interface UseDashboardV2Result {
	/** The gettable dashboard, or `undefined` until the fetch resolves. */
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined;
	/** Variable definitions — always an array, so callers read them without a null-guard. */
	variables: DashboardtypesVariableDTO[];
	isLoading: GetDashboardV2Query['isLoading'];
	isError: GetDashboardV2Query['isError'];
	error: GetDashboardV2Query['error'];
	refetch: GetDashboardV2Query['refetch'];
}

/**
 * Canonical loader for a V2 dashboard by id — the single fetch the dashboard page,
 * panel editor, and config sections share, so they resolve to one react-query cache
 * entry. The generated hook already gates on a truthy id, so no `enabled` override is
 * needed. Optional spec collections are normalized to guaranteed arrays (`variables`)
 * so callers skip `?? []` guards.
 */
export function useDashboardV2(dashboardId: string): UseDashboardV2Result {
	const { data, isLoading, isError, error, refetch } = useGetDashboardV2({
		id: dashboardId,
	});
	const dashboard = data?.data;

	const variables = useMemo(
		() => dashboard?.spec?.variables ?? [],
		[dashboard?.spec?.variables],
	);

	return { dashboard, variables, isLoading, isError, error, refetch };
}
