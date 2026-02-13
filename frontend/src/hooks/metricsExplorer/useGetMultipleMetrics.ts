import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	getGetMetricMetadataQueryKey,
	getMetricMetadata,
} from 'api/generated/services/metrics';
import { GetMetricMetadata200 } from 'api/generated/services/sigNoz.schemas';
import { AxiosResponse } from 'axios';

type QueryResult = UseQueryResult<AxiosResponse<GetMetricMetadata200>, Error>;

type UseGetMultipleMetrics = (
	metricNames: string[],
	options?: UseQueryOptions<AxiosResponse<GetMetricMetadata200>, Error>,
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
				} as UseQueryOptions<AxiosResponse<GetMetricMetadata200>, Error>),
		),
	);
