import { getMetricMeta } from 'api/metrics/ApDex/getMetricMeta';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { MetricMetaProps } from 'types/api/metrics/getApDex';

export const useGetMetricMeta = (
	metricName: string,
): UseQueryResult<AxiosResponse<MetricMetaProps>, AxiosError> =>
	useQuery<AxiosResponse<MetricMetaProps>, AxiosError>({
		queryKey: [{ metricName }],
		queryFn: async () => getMetricMeta(metricName),
	});
