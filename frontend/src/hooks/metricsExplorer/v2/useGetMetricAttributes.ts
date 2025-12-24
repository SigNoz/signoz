import { getMetricAttributes } from 'api/metricsExplorer/v2/getMetricAttributes';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponseV2, SuccessResponseV2 } from 'types/api';
import {
	GetMetricAttributesRequest,
	GetMetricAttributesResponse,
} from 'types/api/metricsExplorer/v2';

type UseGetMetricAttributes = (
	requestData: GetMetricAttributesRequest,
	options?: UseQueryOptions<
		SuccessResponseV2<GetMetricAttributesResponse> | ErrorResponseV2,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponseV2<GetMetricAttributesResponse> | ErrorResponseV2,
	Error
>;

export const useGetMetricAttributes: UseGetMetricAttributes = (
	requestData,
	options,
	headers,
) => {
	const queryKey = [
		REACT_QUERY_KEY.GET_METRIC_ATTRIBUTES,
		requestData.metricName,
		requestData.start,
		requestData.end,
	];

	return useQuery<
		SuccessResponseV2<GetMetricAttributesResponse> | ErrorResponseV2,
		Error
	>({
		queryFn: ({ signal }) => getMetricAttributes(requestData, signal, headers),
		...options,
		queryKey,
	});
};
