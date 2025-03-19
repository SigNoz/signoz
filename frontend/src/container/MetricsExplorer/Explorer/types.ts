import { RelatedMetric } from 'api/metricsExplorer/getRelatedMetrics';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export enum ExplorerTabs {
	TIME_SERIES = 'time-series',
	RELATED_METRICS = 'related-metrics',
}

export interface TimeSeriesProps {
	showOneChartPerQuery: boolean;
}

export interface RelatedMetricsProps {
	metricNames: string[];
}

export interface RelatedMetricsCardProps {
	metric: RelatedMetricWithQueryResult;
}

export interface UseGetRelatedMetricsGraphsProps {
	selectedMetricName: string | null;
	startMs: number;
	endMs: number;
}

export interface UseGetRelatedMetricsGraphsReturn {
	relatedMetrics: RelatedMetricWithQueryResult[];
	isRelatedMetricsLoading: boolean;
	isRelatedMetricsError: boolean;
}

export interface RelatedMetricWithQueryResult extends RelatedMetric {
	queryResult: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>;
}
