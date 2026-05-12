import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { ILog } from 'types/api/logs/log';

import { getEntityLogsQueryPayload } from './utils';

export const K8S_ENTITY_LOGS_EXPRESSION_KEY = 'k8sEntityLogsExpression';

export function useInfiniteEntityLogs({
	queryKey,
	timeRange,
	expression,
}: {
	queryKey: string;
	timeRange: { startTime: number; endTime: number };
	expression: string;
}): {
	logs: ILog[];
	isLoading: boolean;
	isFetching: boolean;
	isFetchingNextPage: boolean;
	isError: boolean;
	error?: unknown;
	hasNextPage: boolean;
	loadMoreLogs: () => void;
	refetch: () => void;
	cancel: () => void;
	reactQueryKey: unknown[];
} {
	const reactQueryKey = useMemo(
		() => [
			REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
			queryKey,
			timeRange.startTime,
			timeRange.endTime,
			expression,
		],
		[queryKey, timeRange.startTime, timeRange.endTime, expression],
	);

	const {
		data,
		isLoading,
		isFetching,
		isFetchingNextPage,
		isError,
		error,
		hasNextPage,
		fetchNextPage,
		refetch,
	} = useInfiniteQuery({
		queryKey: reactQueryKey,
		queryFn: async ({ pageParam = 0, signal }) => {
			const { query } = getEntityLogsQueryPayload({
				start: timeRange.startTime,
				end: timeRange.endTime,
				expression,
				offset: pageParam as number,
				pageSize: DEFAULT_PER_PAGE_VALUE,
			});
			return GetMetricQueryRange(query, ENTITY_VERSION_V5, undefined, signal);
		},
		getNextPageParam: (lastPage, allPages) => {
			const list = lastPage?.payload?.data?.newResult?.data?.result?.[0]?.list;
			if (!list || list.length < DEFAULT_PER_PAGE_VALUE) {
				return;
			}
			return allPages.length * DEFAULT_PER_PAGE_VALUE;
		},
		enabled: !!expression?.trim(),
	});

	const logs = useMemo<ILog[]>(() => {
		if (!data?.pages) {
			return [];
		}

		return data.pages.flatMap((page) => {
			const list = page.payload.data.newResult.data.result?.[0]?.list;
			if (!list) {
				return [];
			}

			return list.map(
				(item) =>
					({
						...item.data,
						timestamp: item.timestamp,
					}) as ILog,
			);
		});
	}, [data?.pages]);

	const loadMoreLogs = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			void fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const queryClient = useQueryClient();

	const cancel = useCallback(() => {
		void queryClient.cancelQueries({
			queryKey: reactQueryKey,
		});
	}, [queryClient, reactQueryKey]);

	return {
		logs,
		isLoading,
		isFetching,
		isFetchingNextPage,
		isError,
		error,
		hasNextPage: !!hasNextPage,
		loadMoreLogs,
		refetch,
		cancel,
		reactQueryKey,
	};
}
