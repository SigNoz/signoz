import {
	MetricsexplorertypesTreemapModeDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

export const METRICS_TABLE_PAGE_SIZE = 10;

export const TREEMAP_VIEW_OPTIONS: {
	value: MetricsexplorertypesTreemapModeDTO;
	label: string;
}[] = [
	{ value: MetricsexplorertypesTreemapModeDTO.timeseries, label: 'Time Series' },
	{ value: MetricsexplorertypesTreemapModeDTO.samples, label: 'Samples' },
];

export const TREEMAP_HEIGHT = 200;
export const TREEMAP_SQUARE_PADDING = 5;

export const TREEMAP_MARGINS = { TOP: 10, LEFT: 10, RIGHT: 10, BOTTOM: 10 };

// TODO: Remove this once API migration is complete
export const METRIC_TYPE_LABEL_MAP = {
	[MetricType.SUM]: 'Sum',
	[MetricType.GAUGE]: 'Gauge',
	[MetricType.HISTOGRAM]: 'Histogram',
	[MetricType.SUMMARY]: 'Summary',
	[MetricType.EXPONENTIAL_HISTOGRAM]: 'Exp. Histogram',
};

export const METRIC_TYPE_LABEL_MAP_V2 = {
	[MetrictypesTypeDTO.sum]: 'Sum',
	[MetrictypesTypeDTO.gauge]: 'Gauge',
	[MetrictypesTypeDTO.histogram]: 'Histogram',
	[MetrictypesTypeDTO.summary]: 'Summary',
	[MetrictypesTypeDTO.exponentialhistogram]: 'Exp. Histogram',
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
