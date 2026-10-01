import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';

import {
	getGetDashboardV2QueryKey,
	useGetSystemDashboard,
} from 'api/generated/services/dashboard';
import type { GetSystemDashboardQueryError } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

const SYSTEM_DASHBOARD_NAME = 'ai-o11y-overview';

const DASHBOARD_ID = 'llm-observability-overview';

export interface UseSystemDashboardResult {
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined;
	isLoading: boolean;
	isError: boolean;
	error: GetSystemDashboardQueryError | null;
	refetch: () => void;
}

export function useSystemDashboard(): UseSystemDashboardResult {
	const queryClient = useQueryClient();
	const { data, isLoading, isError, error, refetch } = useGetSystemDashboard(
		{ name: SYSTEM_DASHBOARD_NAME },
		{ query: { staleTime: Infinity, refetchOnMount: false } },
	);

	const dashboard = useMemo(
		() =>
			data
				? ({
						...data.data,
						id: DASHBOARD_ID,
					} as DashboardtypesGettableDashboardV2DTO)
				: undefined,
		[data],
	);

	if (dashboard) {
		queryClient.setQueryData<GetDashboardV2200>(
			getGetDashboardV2QueryKey({ id: DASHBOARD_ID }),
			{ data: dashboard, status: 'success' },
		);
	}

	const refetchDashboard = useCallback((): void => {
		void refetch();
	}, [refetch]);

	return { dashboard, isLoading, isError, error, refetch: refetchDashboard };
}
