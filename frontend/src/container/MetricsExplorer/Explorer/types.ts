import { Dispatch, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { RelatedMetric } from 'api/metricsExplorer/getRelatedMetrics';
import { SuccessResponse, Warning } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { MetricMetadata } from 'types/api/metricsExplorer/v2/getMetricMetadata';

export enum ExplorerTabs {
	TIME_SERIES = 'time-series',
	RELATED_METRICS = 'related-metrics',
}

export interface TimeSeriesProps {
	showOneChartPerQuery: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	areAllMetricUnitsSame: boolean;
	isMetricUnitsLoading: boolean;
	isMetricUnitsError: boolean;
	metricUnits: (string | undefined)[];
	metricNames: string[];
	metrics: (MetricMetadata | undefined)[];
	handleOpenMetricDetails: (metricName: string) => void;
	yAxisUnit: string | undefined;
	setYAxisUnit: (unit: string) => void;
	showYAxisUnitSelector: boolean;
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
