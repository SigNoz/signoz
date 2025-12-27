import { getMetricDashboards } from 'api/metricsExplorer/v2/getMetricDashboards';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { GetMetricDashboardsResponse } from 'types/api/metricsExplorer/v2';

type UseGetMetricDashboards = (
	metricName: string,
	options?: UseQueryOptions<
		SuccessResponseV2<GetMetricDashboardsResponse>,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<SuccessResponseV2<GetMetricDashboardsResponse>, Error>;

export const useGetMetricDashboards: UseGetMetricDashboards = (
	metricName,
	options,
	headers,
) =>
	useQuery<SuccessResponseV2<GetMetricDashboardsResponse>, Error>({
		queryFn: ({ signal }) => getMetricDashboards(metricName, signal, headers),
		...options,
		queryKey: [REACT_QUERY_KEY.GET_METRIC_DASHBOARDS, metricName],
	});
