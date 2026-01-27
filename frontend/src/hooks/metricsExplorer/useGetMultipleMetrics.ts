import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	getGetMetricMetadataQueryKey,
	getMetricMetadata,
} from 'api/generated/services/metrics';
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
				} as UseQueryOptions<SuccessResponseV2<MetricMetadataResponse>, Error>),
		),
	);
