import {
	getMetricDetails,
	MetricDetailsResponse,
} from 'api/metricsExplorer/getMetricDetails';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQueries, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type QueryData = SuccessResponse<MetricDetailsResponse> | ErrorResponse;
type QueryResult = UseQueryResult<QueryData, Error>;

type UseGetMultipleMetrics = (
	metricNames: string[],
	options?: UseQueryOptions<QueryData, Error>,
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
					queryKey: [REACT_QUERY_KEY.GET_METRIC_DETAILS, metricName],
					queryFn: ({ signal }) => getMetricDetails(metricName, signal, headers),
					...options,
				} as UseQueryOptions<QueryData, Error>),
		),
	);

	return queries as QueryResult[];
};
