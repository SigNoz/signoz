import { MetricType } from 'api/metricsExplorer/getMetricsList';

import { TreemapViewType } from './types';

export const METRICS_TABLE_PAGE_SIZE = 10;

export const TREEMAP_VIEW_OPTIONS: {
	value: TreemapViewType;
	label: string;
}[] = [
	{ value: TreemapViewType.TIMESERIES, label: 'Time Series' },
	{ value: TreemapViewType.SAMPLES, label: 'Samples' },
];

export const TREEMAP_HEIGHT = 200;
export const TREEMAP_SQUARE_PADDING = 5;

export const TREEMAP_MARGINS = { TOP: 10, LEFT: 10, RIGHT: 10, BOTTOM: 10 };

export const METRIC_TYPE_LABEL_MAP = {
	[MetricType.SUM]: 'Sum',
	[MetricType.GAUGE]: 'Gauge',
	[MetricType.HISTOGRAM]: 'Histogram',
	[MetricType.SUMMARY]: 'Summary',
	[MetricType.EXPONENTIAL_HISTOGRAM]: 'Exp. Histogram',
};

export const METRIC_TYPE_VALUES_MAP = {
	[MetricType.SUM]: 'Sum',
	[MetricType.GAUGE]: 'Gauge',
	[MetricType.HISTOGRAM]: 'Histogram',
	[MetricType.SUMMARY]: 'Summary',
	[MetricType.EXPONENTIAL_HISTOGRAM]: 'ExponentialHistogram',
};

export const IS_METRIC_DETAILS_OPEN_KEY = 'isMetricDetailsOpen';
export const IS_INSPECT_MODAL_OPEN_KEY = 'isInspectModalOpen';
export const SELECTED_METRIC_NAME_KEY = 'selectedMetricName';
export const SUMMARY_FILTERS_KEY = 'summaryFilters';
