import { getGetSystemDashboardQueryKey } from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetSystemDashboard200,
} from 'api/generated/services/sigNoz.schemas';
import type { DashboardQuerySource } from 'pages/DashboardPage/DashboardContainer/store/slices/editContextSlice';

export interface SystemDashboardHost {
	/** Definition name without the `signoz---` prefix. */
	name: string;
	select: (
		response: GetSystemDashboard200,
	) => DashboardtypesGettableDashboardV2DTO;
	source: DashboardQuerySource;
}

/**
 * Call at module level: `select` and `source` must stay referentially stable.
 * System dashboards carry no `id`; `id` keys the store's per-dashboard state
 * (saved variable values), so keep it stable across releases.
 */
export function createSystemDashboardHost(
	name: string,
	id: string,
): SystemDashboardHost {
	const select = (
		response: GetSystemDashboard200,
	): DashboardtypesGettableDashboardV2DTO =>
		({ ...response.data, id }) as DashboardtypesGettableDashboardV2DTO;

	return {
		name,
		select,
		source: { queryKey: getGetSystemDashboardQueryKey({ name }), select },
	};
}
