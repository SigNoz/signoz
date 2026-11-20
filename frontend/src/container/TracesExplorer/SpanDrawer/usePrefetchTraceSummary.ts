import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { getGetTraceSummaryQueryOptions } from 'api/generated/services/tracedetail';
import { TRACE_QUERY_STALE_TIME_MS } from 'hooks/trace/constants';

/** Loads a trace's summary into the cache the drawer reads, unless it's already fresh. */
export function usePrefetchTraceSummary(): (traceId: string) => void {
	const queryClient = useQueryClient();
	return useCallback(
		(traceId: string): void => {
			void queryClient.prefetchQuery(
				getGetTraceSummaryQueryOptions(
					{ traceID: traceId },
					{ query: { retry: false, staleTime: TRACE_QUERY_STALE_TIME_MS } },
				),
			);
		},
		[queryClient],
	);
}
