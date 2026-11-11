import { useMemo } from 'react';
import { useGetPublicDashboard } from 'api/generated/services/dashboard';
import type { DashboardtypesGettablePublicDasbhboardDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

export interface UsePublicDashboardMetaReturn {
	publicMeta: DashboardtypesGettablePublicDasbhboardDTO | undefined;
	isPublic: boolean;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
	refetch: () => void;
}

// How long a fetched result stays fresh before a natural trigger may refresh it.
const PUBLIC_META_STALE_TIME = 5 * 60 * 1000;

/**
 * Single source of truth for a dashboard's public-sharing meta. Keyed by dashboard
 * id via the generated query, so the GET happens once globally (the toolbar mounts it
 * with the dashboard) and every other caller — the publish settings drawer — reads the
 * same cache instead of issuing its own request. A mutation that invalidates
 * getGetPublicDashboardQueryKey refreshes all consumers at once.
 *
 * Only fetched on cloud / enterprise tenants, where public dashboards are available.
 */
export function usePublicDashboardMeta(
	dashboardId: string,
): UsePublicDashboardMetaReturn {
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();
	const enabled = !!dashboardId && (isCloudUser || isEnterpriseSelfHostedUser);

	const { data, isLoading, isFetching, error, refetch } = useGetPublicDashboard(
		{ id: dashboardId },
		{
			query: {
				enabled,
				retry: false,
				// refetchOnMount: false stops opening the drawer / switching to the Publish
				// tab from refiring the GET — it reuses the toolbar's cached result. A finite
				// staleTime still lets it refresh naturally once the data ages, and mutations
				// invalidate the key to refresh the published state immediately.
				staleTime: PUBLIC_META_STALE_TIME,
				refetchOnMount: false,
			},
		},
	);

	// react-query retains the last successful `data` after a refetch errors (e.g. the
	// 404 once a dashboard is unpublished), so gate on the error to reflect the
	// private state.
	const publicMeta = error ? undefined : data?.data;

	return useMemo(
		() => ({
			publicMeta,
			isPublic: !!publicMeta?.publicPath,
			isLoading,
			isFetching,
			error,
			refetch,
		}),
		[publicMeta, isLoading, isFetching, error, refetch],
	);
}
