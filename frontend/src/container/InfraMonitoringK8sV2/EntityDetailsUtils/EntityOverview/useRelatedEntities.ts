import { useMemo } from 'react';
import { useQuery } from 'react-query';
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
	fetchListData: FetchRelatedEntities;
	queryKey: string;
	expression: string;
	/** Time range in seconds — see useEntityDetailsTime */
	timeRange: { startTime: number; endTime: number };
	page: number;
	limit: number;
}

interface UseRelatedEntitiesResult {
	records: K8sEntityData[];
	total: number;
	isLoading: boolean;
	isError: boolean;
	error?: APIError | null;
	endTimeBeforeRetention?: boolean;
}

const SECOND_IN_MS = 1000;

export function useRelatedEntities({
	fetchListData,
	queryKey,
	expression,
	timeRange,
	page,
	limit,
}: UseRelatedEntitiesParams): UseRelatedEntitiesResult {
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

	const { data, isLoading, isError } = useQuery({
		queryKey: reactQueryKey,
		queryFn: ({ signal }) =>
			fetchListData(
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
		enabled: !!expression.trim(),
	});

	return {
		records: data?.records ?? data?.data ?? [],
		total: data?.total ?? 0,
		isLoading,
		isError,
		error: data?.error,
		endTimeBeforeRetention: data?.endTimeBeforeRetention,
	};
}
