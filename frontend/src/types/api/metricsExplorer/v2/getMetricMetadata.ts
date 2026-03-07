import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

export interface MetricMetadata {
	description: string;
	type: MetricType;
	unit: string;
	temporality: Temporality;
	isMonotonic: boolean;
}

export interface MetricMetadataResponse {
	status: string;
	data: MetricMetadata;
}
