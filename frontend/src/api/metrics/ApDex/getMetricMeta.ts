import axios from 'api';
import { AxiosResponse } from 'axios';
import { MetricMetaProps } from 'types/api/metrics/getApDex';

export const getMetricMeta = (
	metricName: string,
): Promise<AxiosResponse<MetricMetaProps>> =>
	axios.get(`/metric_meta?metricName=${metricName}`);
