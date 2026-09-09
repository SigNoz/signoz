import { getPublicDashboardDataV2 } from 'api/generated/services/dashboard';
import { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError, isAxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorV2Resp } from 'types/api';

export enum PublicDashboardSchema {
	/** Stored data never migrated to v6 — there is no v2 spec to render. */
	Legacy = 'legacy',
	V2 = 'v2',
}

export type ResolvedPublicDashboard =
	| {
			schema: PublicDashboardSchema.V2;
			data: DashboardtypesGettablePublicDashboardDataV2DTO;
	  }
	| { schema: PublicDashboardSchema.Legacy };

// The v2 endpoint rejects non-v6 rows with this code — our signal that the dashboard
// predates the v2 migration.
const V2_SCHEMA_MISMATCH_CODE = 'dashboard_invalid_data';

function isV2SchemaMismatch(error: unknown): boolean {
	if (!isAxiosError(error)) {
		return false;
	}
	const { response } = error as AxiosError<ErrorV2Resp>;
	return response?.data?.error?.code === V2_SCHEMA_MISMATCH_CODE;
}

// Only a schema mismatch means "legacy"; every other v2 error propagates so the page shows
// its unavailable state rather than implying the dashboard just needs re-migrating.
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
		return { schema: PublicDashboardSchema.Legacy };
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
