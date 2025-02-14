import { Color } from '@signozhq/design-tokens';
import { scaleLinear } from '@visx/scale';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

import { TreemapViewType } from './types';

export const METRICS_TABLE_PAGE_SIZE = 10;

export const TREEMAP_VIEW_OPTIONS: {
	value: TreemapViewType;
	label: string;
}[] = [
	{ value: 'cardinality', label: 'Cardinality' },
	{ value: 'datapoints', label: 'Datapoints' },
];

export const TREEMAP_WIDTH = 1000;
export const TREEMAP_HEIGHT = 300;
export const TREEMAP_SQUARE_PADDING = 15;

export const TREEMAP_SIZE_SCALE = scaleLinear({
	domain: [0, 100],
	range: [10, 50],
});

export const TREEMAP_MARGINS = { TOP: 10, LEFT: 10, RIGHT: 10, BOTTOM: 10 };

export const TREEMAP_COLOR_SCALE = scaleLinear<string>({
	domain: [0, 1000],
	range: [Color.BG_AMBER_500, Color.BG_AMBER_100],
});

export const METRIC_TYPE_LABEL_MAP = {
	[MetricType.SUM]: 'Sum',
	[MetricType.GAUGE]: 'Gauge',
	[MetricType.HISTOGRAM]: 'Histogram',
	[MetricType.SUMMARY]: 'Summary',
	[MetricType.EXPONENTIAL_HISTOGRAM]: 'Exp. Histogram',
};
