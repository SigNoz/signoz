import { getMetricMetadata } from 'api/metricsExplorer/v2/getMetricMetadata';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { MetricMetadataResponse } from 'types/api/metricsExplorer/v2/getMetricMetadata';

type QueryResult = UseQueryResult<
	SuccessResponseV2<MetricMetadataResponse>,
	Error
>;

type UseGetMultipleMetrics = (
	metricNames: string[],
	options?: UseQueryOptions<SuccessResponseV2<MetricMetadataResponse>, Error>,
	headers?: Record<string, string>,
) => QueryResult[];

export const useGetMultipleMetrics: UseGetMultipleMetrics = (
	metricNames,
	options,
	headers,
) =>
	useQueries(
		metricNames.map(
			(metricName) =>
				({
					queryKey: [REACT_QUERY_KEY.GET_METRIC_METADATA, metricName],
					queryFn: ({ signal }) => getMetricMetadata(metricName, signal, headers),
					...options,
				} as UseQueryOptions<SuccessResponseV2<MetricMetadataResponse>, Error>),
		),
	);
