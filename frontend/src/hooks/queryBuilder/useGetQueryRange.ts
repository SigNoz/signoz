import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { useLocation } from 'react-router-dom';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const useGetQueryRange = (
	requestData: GetQueryResultsProps,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> => {
	const { key } = useLocation();

	const queryKey = useMemo(() => {
		if (options?.queryKey) {
			return [...options.queryKey, key];
		}
		return [REACT_QUERY_KEY.GET_QUERY_RANGE, key, requestData];
	}, [key, options?.queryKey, requestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async () => GetMetricQueryRange(requestData),
		...options,
		queryKey,
	});
};
