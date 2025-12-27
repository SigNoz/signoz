import { getMetricAlerts } from 'api/metricsExplorer/v2/getMetricAlerts';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { GetMetricAlertsResponse } from 'types/api/metricsExplorer/v2';

type UseGetMetricAlerts = (
	metricName: string,
	options?: UseQueryOptions<SuccessResponseV2<GetMetricAlertsResponse>, Error>,
	headers?: Record<string, string>,
) => UseQueryResult<SuccessResponseV2<GetMetricAlertsResponse>, Error>;

export const useGetMetricAlerts: UseGetMetricAlerts = (
	metricName,
	options,
	headers,
) =>
	useQuery<SuccessResponseV2<GetMetricAlertsResponse>, Error>({
		queryFn: ({ signal }) => getMetricAlerts(metricName, signal, headers),
		...options,
		queryKey: [REACT_QUERY_KEY.GET_METRIC_ALERTS, metricName],
	});
