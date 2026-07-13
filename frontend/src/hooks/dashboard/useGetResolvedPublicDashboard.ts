import { getPublicDashboardDataV2 } from 'api/generated/services/dashboard';
import { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';
import getPublicDashboardDataAPI from 'api/dashboard/public/getPublicDashboardData';
import { AxiosError, isAxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorV2Resp } from 'types/api';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';

export enum PublicDashboardSchema {
	V1 = 'v1',
	V2 = 'v2',
}

export type ResolvedPublicDashboard =
	| {
			schema: PublicDashboardSchema.V2;
			data: DashboardtypesGettablePublicDashboardDataV2DTO;
	  }
	| { schema: PublicDashboardSchema.V1; data: PublicDashboardDataProps };

// The v2 endpoint rejects non-v6 rows with this code — our signal that it's a v1 dashboard.
const V2_SCHEMA_MISMATCH_CODE = 'dashboard_invalid_data';

function isV2SchemaMismatch(error: unknown): boolean {
	if (!isAxiosError(error)) {
		return false;
	}
	const { response } = error as AxiosError<ErrorV2Resp>;
	return response?.data?.error?.code === V2_SCHEMA_MISMATCH_CODE;
}

// Probe v2 first, fall back to v1 only on a schema mismatch. v1-first is unsafe: it 200s for a
// v2 dashboard with queries un-redacted. Other v2 errors re-throw rather than mis-render as v1.
async function resolvePublicDashboard(
	id: string,
): Promise<ResolvedPublicDashboard> {
	try {
		const v2 = await getPublicDashboardDataV2({ id });
		return { schema: PublicDashboardSchema.V2, data: v2.data };
	} catch (error) {
		if (!isV2SchemaMismatch(error)) {
			throw error;
		}
		const v1 = await getPublicDashboardDataAPI({ id });
		return { schema: PublicDashboardSchema.V1, data: v1.data };
	}
}

export const useGetResolvedPublicDashboard = (
	id: string,
): UseQueryResult<ResolvedPublicDashboard, Error> =>
	useQuery<ResolvedPublicDashboard, Error>({
		queryFn: () => resolvePublicDashboard(id),
		queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD_RESOLVED, id],
		enabled: !!id,
	});
