import {
	getMetricMetadata,
	MetricMetadataResponse,
} from 'api/metricsExplorer/getMetricMetadata';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';

type QueryResult = UseQueryResult<MetricMetadataResponse, Error>;

type UseGetMultipleMetrics = (
	metricNames: string[],
	options?: UseQueryOptions<MetricMetadataResponse, Error>,
	headers?: Record<string, string>,
) => QueryResult[];

export const useGetMultipleMetrics: UseGetMultipleMetrics = (
	metricNames,
	options,
	headers,
) => {
	const queries = useQueries(
		metricNames.map(
			(metricName) =>
				({
					queryKey: [REACT_QUERY_KEY.GET_METRIC_METADATA, metricName],
					queryFn: ({ signal }) => getMetricMetadata(metricName, signal, headers),
					...options,
				} as UseQueryOptions<MetricMetadataResponse, Error>),
		),
	);

	return queries as QueryResult[];
};
