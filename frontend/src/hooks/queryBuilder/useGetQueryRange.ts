import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

type UseGetQueryRange = (
	requestData: GetQueryResultsProps,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
) => UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>;

export const useGetQueryRange: UseGetQueryRange = (requestData, options) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey) {
			return [...options.queryKey];
		}
		return [REACT_QUERY_KEY.GET_QUERY_RANGE, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async () => GetMetricQueryRange(requestData),
		...options,
		queryKey,
	});
};
