import { ApiV4Instance } from 'api';
import { AxiosResponse } from 'axios';
import { MetricMetaProps } from 'types/api/metrics/getApDex';

export const getMetricMeta = (
	metricName: string,
	servicename: string,
): Promise<AxiosResponse<MetricMetaProps>> =>
	ApiV4Instance.get(
		`/metric/metric_metadata?metricName=${metricName}&serviceName=${servicename}`,
	);
