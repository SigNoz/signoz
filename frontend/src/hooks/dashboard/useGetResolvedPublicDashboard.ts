import { getPublicDashboardDataV2 } from 'api/generated/services/dashboard';
import { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';
import getPublicDashboardDataAPI from 'api/dashboard/public/getPublicDashboardData';
import { AxiosError, isAxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorV2Resp } from 'types/api';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';

/**
 * A public dashboard is either the legacy v1 storable model or the v2 Perses spec.
 * Anonymous viewers have no feature flags, so we can't branch on `use_dashboard_v2` —
 * we discriminate on the schema the backend actually serves.
 */
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

/**
 * The v2 model endpoint rejects any dashboard not in the current Perses (v6) schema with
 * HTTP 501 and this error code. It is the signal that the dashboard was authored in the v1
 * editor and must be served by the v1 endpoint instead.
 */
const V2_SCHEMA_MISMATCH_CODE = 'dashboard_invalid_data';

function isV2SchemaMismatch(error: unknown): boolean {
	if (!isAxiosError(error)) {
		return false;
	}
	const { response } = error as AxiosError<ErrorV2Resp>;
	return response?.data?.error?.code === V2_SCHEMA_MISMATCH_CODE;
}

/**
 * Resolve the correct model for a public dashboard given only its share id.
 *
 * We probe v2 first, then fall back to v1 — never the other way around. The v2 endpoint
 * strictly rejects non-v6 rows, so its "schema mismatch" error is a clean v1 signal. The v1
 * endpoint, in contrast, returns 200 for a v2 dashboard with its query internals UN-redacted,
 * so a v1-first probe would both fail to discriminate and leak queries to anonymous viewers.
 *
 * Any v2 error that isn't a schema mismatch (network, license, corrupt data) is re-thrown so
 * it surfaces as an error, rather than being masked by an incorrect v1 render.
 */
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
