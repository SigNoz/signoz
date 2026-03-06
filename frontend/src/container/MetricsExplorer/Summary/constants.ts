import {
	MetricsexplorertypesTreemapModeDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

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

export const METRIC_TYPE_VIEW_LABEL_MAP: Record<MetrictypesTypeDTO, string> = {
	[MetrictypesTypeDTO.sum]: 'Sum',
	[MetrictypesTypeDTO.gauge]: 'Gauge',
	[MetrictypesTypeDTO.histogram]: 'Histogram',
	[MetrictypesTypeDTO.summary]: 'Summary',
	[MetrictypesTypeDTO.exponentialhistogram]: 'Exp. Histogram',
};

export const METRIC_TYPE_VIEW_VALUES_MAP: Record<MetrictypesTypeDTO, string> = {
	[MetrictypesTypeDTO.sum]: 'Sum',
	[MetrictypesTypeDTO.gauge]: 'Gauge',
	[MetrictypesTypeDTO.histogram]: 'Histogram',
	[MetrictypesTypeDTO.summary]: 'Summary',
	[MetrictypesTypeDTO.exponentialhistogram]: 'ExponentialHistogram',
};

export const IS_METRIC_DETAILS_OPEN_KEY = 'isMetricDetailsOpen';
export const IS_INSPECT_MODAL_OPEN_KEY = 'isInspectModalOpen';
export const SELECTED_METRIC_NAME_KEY = 'selectedMetricName';
