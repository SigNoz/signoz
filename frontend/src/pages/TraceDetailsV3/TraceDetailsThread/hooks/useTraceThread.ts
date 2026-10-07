import { useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';
import {
	getGetTraceThreadQueryKey,
	getTraceThread,
} from 'api/generated/services/tracedetail';
import type { GetTraceThreadParams } from 'api/generated/services/sigNoz.schemas';

import { ThreadSpan } from '../types';
import { isNotFoundError, toThreadSpan } from '../utils';

const THREAD_PAGE_LIMIT = 100;
const MAX_RETRIES = 3;

type PageParam = Pick<GetTraceThreadParams, 'after' | 'before'>;

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
	const query = useInfiniteQuery({
		queryKey: getGetTraceThreadQueryKey(
			{ traceID: traceId },
			{ spanId: anchorSpanId },
		),
		queryFn: ({ pageParam, signal }) => {
			const { after, before } = (pageParam ?? {}) as PageParam;
			return getTraceThread(
				{ traceID: traceId },
				{
					limit: THREAD_PAGE_LIMIT,
					after,
					before,
					// The anchor only shapes the first page; cursors drive the rest.
					spanId: after || before ? undefined : anchorSpanId,
				},
				signal,
			);
		},
		getNextPageParam: (lastPage): PageParam | undefined =>
			lastPage.data.nextCursor ? { after: lastPage.data.nextCursor } : undefined,
		getPreviousPageParam: (firstPage): PageParam | undefined =>
			firstPage.data.prevCursor
				? { before: firstPage.data.prevCursor }
				: undefined,
		// An unknown anchor span is a 404; retrying won't find it.
		retry: (failureCount, error): boolean =>
			!isNotFoundError(error) && failureCount < MAX_RETRIES,
		enabled: !!traceId,
		refetchOnWindowFocus: false,
	});

	const spans = useMemo(
		() =>
			query.data?.pages.flatMap((page) => page.data.spans.map(toThreadSpan)) ?? [],
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
