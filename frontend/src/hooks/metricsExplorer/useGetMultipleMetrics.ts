import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	getGetMetricMetadataQueryKey,
	getMetricMetadata,
} from 'api/generated/services/metrics';
import { GetMetricMetadata200 } from 'api/generated/services/sigNoz.schemas';

type QueryResult = UseQueryResult<GetMetricMetadata200, Error>;

type UseGetMultipleMetrics = (
	metricNames: string[],
	options?: UseQueryOptions<GetMetricMetadata200, Error>,
	headers?: Record<string, string>,
) => QueryResult[];

export const useGetMultipleMetrics: UseGetMultipleMetrics = (
	metricNames,
	options,
) =>
	useQueries(
		metricNames.map(
			(metricName) =>
				({
					queryKey: getGetMetricMetadataQueryKey({
						metricName,
					}),
					queryFn: ({ signal }) =>
						getMetricMetadata(
							{
								metricName,
							},
							signal,
						),
					...options,
				} as UseQueryOptions<GetMetricMetadata200, Error>),
		),
	);
