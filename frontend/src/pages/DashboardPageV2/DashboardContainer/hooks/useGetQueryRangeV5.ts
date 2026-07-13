import { useQuery, UseQueryResult } from 'react-query';
import { isAxiosError } from 'axios';
import { queryRangeV5 } from 'api/generated/services/querier';
import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { MAX_QUERY_RETRIES } from 'constants/reactQuery';

export interface UseGetQueryRangeV5Args {
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO;
	queryKey: unknown[];
	enabled: boolean;
	/** Retain prior data across a key change (list paging) so the table + pager stay mounted. */
	keepPreviousData?: boolean;
}

/**
 * Don't retry deterministic 4xx (bad query, auth) — they fail identically (V1 parity).
 * The retry callback gets the raw AxiosError this path rejects with (not yet normalized to
 * APIError — that happens later at the display boundary), so inspect it at the axios level.
 */
export function retryUnlessClientError(
	failureCount: number,
	error: Error,
): boolean {
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
 * Pure-V5 query-range fetch: posts the generated request DTO and returns the raw response.
 * Wrapped in `useQuery` (not the generated `useQueryRangeV5` mutation) for caching, `enabled`
 * gating, and refetch.
 */
export function useGetQueryRangeV5({
	requestPayload,
	queryKey,
	enabled,
	keepPreviousData,
}: UseGetQueryRangeV5Args): UseQueryResult<QueryRangeV5200, Error> {
	return useQuery<QueryRangeV5200, Error>({
		queryKey,
		queryFn: ({ signal }) => queryRangeV5(requestPayload, signal),
		enabled,
		retry: retryUnlessClientError,
		keepPreviousData,
	});
}
