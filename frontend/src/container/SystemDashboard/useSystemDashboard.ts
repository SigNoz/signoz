import { useCallback } from 'react';
import { useGetSystemDashboard } from 'api/generated/services/dashboard';
import type { GetSystemDashboardQueryError } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import type { SystemDashboardHost } from './systemDashboardHost';

export interface UseSystemDashboardResult {
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined;
	isLoading: boolean;
	isError: boolean;
	error: GetSystemDashboardQueryError | null;
	refetch: () => void;
}

export function useSystemDashboard(
	host: SystemDashboardHost,
): UseSystemDashboardResult {
	const {
		data: dashboard,
		isLoading,
		isError,
		error,
		refetch,
	} = useGetSystemDashboard(
		{ name: host.name },
		{
			query: {
				select: host.select,
				staleTime: Infinity,
				refetchOnMount: false,
			},
		},
	);

	const refetchDashboard = useCallback((): void => {
		void refetch();
	}, [refetch]);

	return { dashboard, isLoading, isError, error, refetch: refetchDashboard };
}
