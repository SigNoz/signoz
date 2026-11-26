import { useCallback, useMemo } from 'react';
import { QueryKey, useInfiniteQuery } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { useKeepRowsForSameQuery } from 'container/TracesExplorer/TracesTable/useKeepRowsForSameQuery';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { Warning } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getListLimit, getNextPageOffset, transformSpanRows } from './utils';

type UseListViewInfiniteQueryParams = {
	query: Query;
	queryKey: QueryKey;
	enabled: boolean;
};

type UseListViewInfiniteQueryResult = {
	rows: TracesTableRow[];
	warning: Warning | undefined;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: Error | null;
	loadMore: () => void;
};

export function useListViewInfiniteQuery({
	query,
	queryKey,
	enabled,
}: UseListViewInfiniteQueryParams): UseListViewInfiniteQueryResult {
	const limit = getListLimit(query);

	const {
		data,
		isLoading,
		isFetching,
		isFetchingNextPage,
		isError,
		error,
		hasNextPage,
		fetchNextPage,
		isPreviousData,
	} = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam = 0, signal }) =>
			GetMetricQueryRange(
				{
					query,
					graphType: PANEL_TYPES.LIST,
					selectedTime: 'GLOBAL_TIME',
					// Every page reads the window in redux, so later pages cannot drift.
					globalSelectedInterval: 'custom',
					params: { dataSource: 'traces' },
					tableParams: {
						pagination: {
							offset: pageParam as number,
							limit: limit
								? Math.min(DEFAULT_PER_PAGE_VALUE, limit - (pageParam as number))
								: DEFAULT_PER_PAGE_VALUE,
						},
					},
				},
				ENTITY_VERSION_V5,
				undefined,
				signal,
			),
		getNextPageParam: (_lastPage, allPages) =>
			getNextPageOffset(
				allPages.map(
					(page) => page.payload.data.newResult.data.result?.[0]?.list?.length ?? 0,
				),
				DEFAULT_PER_PAGE_VALUE,
				limit,
			),
		keepPreviousData: true,
		enabled,
	});

	const keepRows = useKeepRowsForSameQuery(isPreviousData);

	const rows = useMemo(
		() =>
			keepRows
				? (data?.pages ?? []).flatMap((page) =>
						transformSpanRows(page.payload.data.newResult.data.result ?? []),
					)
				: [],
		[data?.pages, keepRows],
	);

	const loadMore = useCallback((): void => {
		if (hasNextPage && !isFetchingNextPage) {
			void fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return {
		rows,
		warning: data?.pages[data.pages.length - 1]?.warning,
		isLoading,
		isFetching,
		isError,
		error: error as Error | null,
		loadMore,
	};
}
