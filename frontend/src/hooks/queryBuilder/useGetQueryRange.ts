import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const useGetQueryRange = (
	requestData: GetQueryResultsProps,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> =>
	useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryKey: [REACT_QUERY_KEY.GET_QUERY_RANGE, requestData],
		queryFn: async () => GetMetricQueryRange(requestData),
		...options,
	});
