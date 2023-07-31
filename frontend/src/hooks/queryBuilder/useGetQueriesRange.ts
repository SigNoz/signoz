import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import {
	QueryKey,
	useQueries,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const useGetQueriesRange = (
	requestData: GetQueryResultsProps[],
	options: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>[] => {
	const queryKey = useMemo(() => {
		if (options?.queryKey) {
			return [...options.queryKey];
		}
		return [REACT_QUERY_KEY.GET_QUERY_RANGE, requestData];
	}, [options?.queryKey, requestData]);

	const queryData = requestData.map((request, index) => ({
		queryFn: async (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
			GetMetricQueryRange(request),
		...options,
		queryKey: [...queryKey, index] as QueryKey,
	}));

	return useQueries(queryData);
};
