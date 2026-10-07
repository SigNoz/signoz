import { useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { getTraceThread } from '../getTraceThread';
import { ThreadSpan, TraceThreadResponse } from '../types';

const THREAD_PAGE_LIMIT = 100;

interface PageParam {
	after?: string;
	before?: string;
}

interface UseTraceThreadResult {
	spans: ThreadSpan[];
	isLoading: boolean;
	isError: boolean;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	isFetchingNextPage: boolean;
	isFetchingPreviousPage: boolean;
	fetchNextPage: () => Promise<unknown>;
	fetchPreviousPage: () => Promise<unknown>;
}

export function useTraceThread(
	traceId: string,
	anchorSpanId?: string,
): UseTraceThreadResult {
	const query = useInfiniteQuery<TraceThreadResponse>({
		queryKey: [REACT_QUERY_KEY.GET_TRACE_THREAD, traceId, anchorSpanId],
		queryFn: ({ pageParam }) => {
			const { after, before } = (pageParam ?? {}) as PageParam;
			return getTraceThread({
				traceId,
				limit: THREAD_PAGE_LIMIT,
				after,
				before,
				// The anchor only shapes the first page; cursors drive the rest.
				spanId: after || before ? undefined : anchorSpanId,
			});
		},
		getNextPageParam: (lastPage): PageParam | undefined =>
			lastPage.nextCursor ? { after: lastPage.nextCursor } : undefined,
		getPreviousPageParam: (firstPage): PageParam | undefined =>
			firstPage.prevCursor ? { before: firstPage.prevCursor } : undefined,
		enabled: !!traceId,
		refetchOnWindowFocus: false,
	});

	const spans = useMemo(
		() => query.data?.pages.flatMap((page) => page.spans) ?? [],
		[query.data],
	);

	return {
		spans,
		isLoading: query.isLoading,
		isError: query.isError,
		hasNextPage: !!query.hasNextPage,
		hasPreviousPage: !!query.hasPreviousPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isFetchingPreviousPage: query.isFetchingPreviousPage,
		fetchNextPage: query.fetchNextPage,
		fetchPreviousPage: query.fetchPreviousPage,
	};
}
