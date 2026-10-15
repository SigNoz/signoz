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
const STALE_TIME_MS = 5 * 60 * 1000;

type PageParam = Pick<GetTraceThreadParams, 'after' | 'before'>;

interface UseTraceThreadOptions {
	traceId: string;
	interestedSpanId?: string;
}

interface UseTraceThreadResult {
	spans: ThreadSpan[];
	spansAboveFirstPage: number;
	isLoading: boolean;
	isError: boolean;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	isFetchingNextPage: boolean;
	isFetchingPreviousPage: boolean;
	fetchNextPage: () => Promise<unknown>;
	fetchPreviousPage: () => Promise<unknown>;
}

export function useTraceThread({
	traceId,
	interestedSpanId,
}: UseTraceThreadOptions): UseTraceThreadResult {
	const query = useInfiniteQuery({
		queryKey: getGetTraceThreadQueryKey(
			{ traceID: traceId },
			{ spanId: interestedSpanId },
		),
		queryFn: ({ pageParam, signal }) => {
			const { after, before } = (pageParam ?? {}) as PageParam;
			return getTraceThread(
				{ traceID: traceId },
				{
					limit: THREAD_PAGE_LIMIT,
					after,
					before,
					// The interested span only shapes the first page; cursors drive the rest.
					spanId: after || before ? undefined : interestedSpanId,
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
		// An unknown interested span is a 404; retrying won't find it.
		retry: (failureCount, error): boolean =>
			!isNotFoundError(error) && failureCount < MAX_RETRIES,
		enabled: !!traceId,
		refetchOnWindowFocus: false,
		staleTime: STALE_TIME_MS,
	});

	const spans = useMemo(
		() =>
			query.data?.pages.flatMap((page) => page.data.spans.map(toThreadSpan)) ?? [],
		[query.data],
	);

	const spansAboveFirstPage = useMemo(
		() =>
			query.data?.pages.reduce(
				(count, page, index) =>
					(query.data.pageParams[index] as PageParam | undefined)?.before
						? count + page.data.spans.length
						: count,
				0,
			) ?? 0,
		[query.data],
	);

	return {
		spans,
		spansAboveFirstPage,
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
