import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

type UseGetQueryRange = (
	requestData: GetQueryResultsProps,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
) => UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>;

export const useGetQueryRange: UseGetQueryRange = (requestData, options) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}

		if (options?.queryKey && typeof options.queryKey === 'string') {
			return options.queryKey;
		}

		return [REACT_QUERY_KEY.GET_QUERY_RANGE, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async ({ signal }) => GetMetricQueryRange(requestData, signal),
		...options,
		queryKey,
	});
};
