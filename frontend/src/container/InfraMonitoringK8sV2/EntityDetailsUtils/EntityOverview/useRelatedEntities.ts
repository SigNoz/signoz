import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import APIError from 'types/api/error';

import {
	K8sEntityData,
	K8sEntityListConfig,
} from '../../Base/entity.config.types';
import { SelectedItemParams } from '../../hooks';

type FetchRelatedEntities = K8sEntityListConfig<
	K8sEntityData,
	string | SelectedItemParams
>['fetchListData'];

interface UseRelatedEntitiesParams {
	/** Absent while the target category is still unresolved; the query stays idle */
	fetchListData?: FetchRelatedEntities;
	queryKey: string;
	expression: string;
	/** Time range in seconds — see useEntityDetailsTime */
	timeRange: { startTime: number; endTime: number };
}

interface UseRelatedEntitiesResult {
	records: K8sEntityData[];
	total: number;
	page: number;
	limit: number;
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error?: APIError | null;
	endTimeBeforeRetention?: boolean;
	refetch: () => void;
	cancel: () => void;
}

export const RELATED_ENTITIES_PAGE_SIZE = 10;

const SECOND_IN_MS = 1000;

export function useRelatedEntities({
	fetchListData,
	queryKey,
	expression,
	timeRange,
}: UseRelatedEntitiesParams): UseRelatedEntitiesResult {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(RELATED_ENTITIES_PAGE_SIZE);

	useEffect(() => {
		setPage(1);
	}, [expression, queryKey]);

	const reactQueryKey = useMemo(
		() => [
			REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
			queryKey,
			timeRange.startTime,
			timeRange.endTime,
			expression,
			page,
			limit,
		],
		[queryKey, timeRange.startTime, timeRange.endTime, expression, page, limit],
	);

	const { data, isLoading, isFetching, isError, refetch } = useQuery({
		queryKey: reactQueryKey,
		queryFn: ({ signal }) =>
			(fetchListData as FetchRelatedEntities)(
				{
					filter: { expression },
					offset: (page - 1) * limit,
					limit,
					// The list APIs take milliseconds, useEntityDetailsTime gives seconds
					start: timeRange.startTime * SECOND_IN_MS,
					end: timeRange.endTime * SECOND_IN_MS,
				},
				signal,
			),
		enabled: !!fetchListData && !!expression.trim(),
	});

	const cancel = useCallback((): void => {
		void queryClient.cancelQueries({ queryKey: reactQueryKey });
	}, [queryClient, reactQueryKey]);

	const handleRefetch = useCallback((): void => {
		void refetch();
	}, [refetch]);

	return {
		records: data?.records ?? data?.data ?? [],
		total: data?.total ?? 0,
		page,
		limit,
		setPage,
		setLimit,
		isLoading,
		isFetching,
		isError,
		error: data?.error,
		endTimeBeforeRetention: data?.endTimeBeforeRetention,
		refetch: handleRefetch,
		cancel,
	};
}
