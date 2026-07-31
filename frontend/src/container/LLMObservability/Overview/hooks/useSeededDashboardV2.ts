import { useQueryClient } from 'react-query';

import { getGetDashboardV2QueryKey } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import dashboardV2Json from '../json/dashboard.json';

const dashboard =
	dashboardV2Json as unknown as DashboardtypesGettableDashboardV2DTO;

export interface UseSeededDashboardV2Result {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	refetch: () => void;
}

const noop = (): void => {};

export function useSeededDashboardV2(): UseSeededDashboardV2Result {
	const queryClient = useQueryClient();

	const key = getGetDashboardV2QueryKey({ id: dashboard.id });
	if (queryClient.getQueryData<GetDashboardV2200>(key) === undefined) {
		queryClient.setQueryData<GetDashboardV2200>(key, {
			data: dashboard,
			status: 'success',
		});
	}

	return { dashboard, refetch: noop };
}
