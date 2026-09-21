import { useCallback, useMemo, useRef } from 'react';
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

	// Seed during render (not an effect) so the first Panel render already resolves the
	// dashboard from the cache. Re-seeds only on a new payload, so in-place cache
	// updates below (optimistic patches) survive re-renders.
	const seeded = useRef<DashboardtypesGettableDashboardV2DTO>();
	if (dashboard && seeded.current !== dashboard) {
		seeded.current = dashboard;
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
