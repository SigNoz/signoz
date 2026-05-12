import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';

import { getEntityTracesQueryPayload } from './utils';

export const K8S_ENTITY_TRACES_EXPRESSION_KEY = 'k8sEntityTracesExpression';

export interface TraceRow {
	timestamp: string;
	data: Record<string, unknown>;
}

export function useEntityTraces({
	queryKey,
	timeRange,
	expression,
	offset = 0,
	pageSize = 10,
}: {
	queryKey: string;
	timeRange: { startTime: number; endTime: number };
	expression: string;
	offset?: number;
	pageSize?: number;
}): {
	traces: TraceRow[];
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error?: unknown;
	currentCount: number;
	hasMore: boolean;
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
			offset,
			pageSize,
		],
		[
			queryKey,
			timeRange.startTime,
			timeRange.endTime,
			expression,
			offset,
			pageSize,
		],
	);

	const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
		queryKey: reactQueryKey,
		queryFn: async () => {
			const { query } = getEntityTracesQueryPayload({
				start: timeRange.startTime,
				end: timeRange.endTime,
				expression,
				offset,
				pageSize,
			});
			return GetMetricQueryRange(query, ENTITY_VERSION_V5);
		},
		enabled: !!expression?.trim(),
	});

	const result = data?.payload?.data?.newResult?.data?.result?.[0];

	const traces = useMemo<TraceRow[]>(() => {
		const list = result?.list;
		if (!list) {
			return [];
		}

		return list.map((item) => ({
			data: item.data,
			timestamp: item.timestamp,
		}));
	}, [result?.list]);

	const currentCount = result?.list?.length || 0;

	// Has more if nextCursor exists or if we got a full page of results
	const hasMore = !!result?.nextCursor || currentCount >= pageSize;

	const queryClient = useQueryClient();

	const cancel = useCallback(() => {
		void queryClient.cancelQueries({
			queryKey: reactQueryKey,
		});
	}, [queryClient, reactQueryKey]);

	return {
		traces,
		isLoading,
		isFetching,
		isError,
		error,
		currentCount,
		hasMore,
		refetch,
		cancel,
		reactQueryKey,
	};
}
