import { useQuery, UseQueryResult } from 'react-query';
import { isAxiosError } from 'axios';
import { queryRangeV5 } from 'api/generated/services/querier';
import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { MAX_QUERY_RETRIES } from 'constants/reactQuery';

export interface UseGetQueryRangeV5Args {
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined;
	queryKey: unknown[];
	enabled: boolean;
}

// 4xx responses are deterministic (bad query, auth) — retrying re-sends a
// request that will fail identically. Same policy as V1's useGetQueryRange.
function retryUnlessClientError(failureCount: number, error: Error): boolean {
	if (isAxiosError(error)) {
		if (error.code === 'ERR_CANCELED') {
			return false;
		}
		const status = error.response?.status;
		if (status && status >= 400 && status < 500) {
			return false;
		}
	}
	return failureCount < MAX_QUERY_RETRIES;
}

/**
 * Pure-V5 query-range fetch: posts the generated request DTO via the
 * generated `queryRangeV5` call and returns the raw generated response —
 * no V1 `Query` shape on either leg. Wrapped in `useQuery` (not the
 * generated `useQueryRangeV5` mutation hook) because panel fetches need
 * caching, `enabled` gating, and refetch semantics.
 */
export function useGetQueryRangeV5({
	requestPayload,
	queryKey,
	enabled,
}: UseGetQueryRangeV5Args): UseQueryResult<QueryRangeV5200, Error> {
	return useQuery<QueryRangeV5200, Error>({
		queryKey,
		queryFn: ({ signal }) => queryRangeV5(requestPayload, signal),
		enabled: enabled && !!requestPayload,
		retry: retryUnlessClientError,
	});
}
