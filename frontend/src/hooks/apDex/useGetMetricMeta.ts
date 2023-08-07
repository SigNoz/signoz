import { getMetricMeta } from 'api/metrics/ApDex/getMetricMeta';
import { AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { MetricMetaProps } from 'types/api/metrics/getApDex';

export const useGetMetricMeta = (
	metricName: string,
): UseQueryResult<AxiosResponse<MetricMetaProps>> => {
	const queryKey = [{ metricName }];
	return useQuery<AxiosResponse<MetricMetaProps>>({
		queryKey,
		queryFn: async () => getMetricMeta(metricName),
	});
};
