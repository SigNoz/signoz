import { useCallback } from 'react';

import {
	getGetSystemDashboardQueryKey,
	useGetSystemDashboard,
} from 'api/generated/services/dashboard';
import type { GetSystemDashboardQueryError } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetSystemDashboard200,
} from 'api/generated/services/sigNoz.schemas';
import type { DashboardQuerySource } from 'pages/DashboardPage/DashboardContainer/store/slices/editContextSlice';

const SYSTEM_DASHBOARD_NAME = 'ai-o11y-overview';

const DASHBOARD_ID = 'llm-observability-overview';

// System dashboards have no `id`; a fixed one keys the store's per-dashboard state.
const selectDashboard = (
	response: GetSystemDashboard200,
): DashboardtypesGettableDashboardV2DTO =>
	({
		...response.data,
		id: DASHBOARD_ID,
	}) as DashboardtypesGettableDashboardV2DTO;

export const SYSTEM_DASHBOARD_SOURCE: DashboardQuerySource = {
	queryKey: getGetSystemDashboardQueryKey({ name: SYSTEM_DASHBOARD_NAME }),
	select: selectDashboard,
};

export interface UseSystemDashboardResult {
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined;
	isLoading: boolean;
	isError: boolean;
	error: GetSystemDashboardQueryError | null;
	refetch: () => void;
}

export function useSystemDashboard(): UseSystemDashboardResult {
	const {
		data: dashboard,
		isLoading,
		isError,
		error,
		refetch,
	} = useGetSystemDashboard(
		{ name: SYSTEM_DASHBOARD_NAME },
		{
			query: {
				select: selectDashboard,
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
