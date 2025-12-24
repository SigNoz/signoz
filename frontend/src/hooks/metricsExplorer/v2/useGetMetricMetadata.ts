import { getMetricMetadata } from 'api/metricsExplorer/v2/getMetricMetadata';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponseV2, SuccessResponseV2 } from 'types/api';
import { GetMetricMetadataResponse } from 'types/api/metricsExplorer/v2';

type UseGetMetricMetadata = (
	metricName: string,
	options?: UseQueryOptions<
		SuccessResponseV2<GetMetricMetadataResponse> | ErrorResponseV2,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponseV2<GetMetricMetadataResponse> | ErrorResponseV2,
	Error
>;

export const useGetMetricMetadata: UseGetMetricMetadata = (
	metricName,
	options,
	headers,
) =>
	useQuery<
		SuccessResponseV2<GetMetricMetadataResponse> | ErrorResponseV2,
		Error
	>({
		queryFn: ({ signal }) => getMetricMetadata(metricName, signal, headers),
		...options,
		queryKey: [REACT_QUERY_KEY.GET_METRIC_METADATA, metricName],
	});
