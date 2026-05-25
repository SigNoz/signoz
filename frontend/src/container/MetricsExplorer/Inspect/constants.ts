import { Color } from '@signozhq/design-tokens';
import { BarChart, ChartBar, Diff, Gauge, Histogram } from '@signozhq/icons';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';

import {
	MetricInspectionState,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from './types';

export const INSPECT_FEATURE_FLAG_KEY = 'metrics-explorer-inspect-feature-flag';

export const METRIC_TYPE_TO_COLOR_MAP: Record<MetrictypesTypeDTO, string> = {
	[MetrictypesTypeDTO.gauge]: Color.BG_SAKURA_500,
	[MetrictypesTypeDTO.histogram]: Color.BG_SIENNA_500,
	[MetrictypesTypeDTO.sum]: Color.BG_ROBIN_500,
	[MetrictypesTypeDTO.summary]: Color.BG_FOREST_500,
	[MetrictypesTypeDTO.exponentialhistogram]: Color.BG_AQUA_500,
};

//TODO: remove typeof Gauge when we export icons as React components instead of functions that return React components
// https://github.com/SigNoz/icons/issues/50
export const METRIC_TYPE_TO_ICON_MAP: Record<MetrictypesTypeDTO, typeof Gauge> =
	{
		[MetrictypesTypeDTO.gauge]: Gauge,
		[MetrictypesTypeDTO.histogram]: Histogram,
		[MetrictypesTypeDTO.sum]: Diff,
		[MetrictypesTypeDTO.summary]: ChartBar,
		[MetrictypesTypeDTO.exponentialhistogram]: BarChart,
	};

export const TIME_AGGREGATION_OPTIONS: Record<TimeAggregationOptions, string> =
	{
		[TimeAggregationOptions.LATEST]: 'Latest',
		[TimeAggregationOptions.SUM]: 'Sum',
		[TimeAggregationOptions.AVG]: 'Avg',
		[TimeAggregationOptions.MIN]: 'Min',
		[TimeAggregationOptions.MAX]: 'Max',
		[TimeAggregationOptions.COUNT]: 'Count',
	};

export const SPACE_AGGREGATION_OPTIONS: Record<
	SpaceAggregationOptions,
	string
> = {
	[SpaceAggregationOptions.SUM_BY]: 'Sum by',
	[SpaceAggregationOptions.MIN_BY]: 'Min by',
	[SpaceAggregationOptions.MAX_BY]: 'Max by',
	[SpaceAggregationOptions.AVG_BY]: 'Avg by',
};

export const SPACE_AGGREGATION_OPTIONS_FOR_EXPANDED_VIEW: Record<
	SpaceAggregationOptions,
	string
> = {
	[SpaceAggregationOptions.SUM_BY]: 'Sum',
	[SpaceAggregationOptions.MIN_BY]: 'Min',
	[SpaceAggregationOptions.MAX_BY]: 'Max',
	[SpaceAggregationOptions.AVG_BY]: 'Avg',
};

export const INITIAL_INSPECT_METRICS_OPTIONS: MetricInspectionState = {
	currentOptions: {
		timeAggregationOption: undefined,
		timeAggregationInterval: undefined,
		spaceAggregationOption: undefined,
		spaceAggregationLabels: [],
		filterExpression: '',
	},
	appliedOptions: {
		timeAggregationOption: undefined,
		timeAggregationInterval: undefined,
		spaceAggregationOption: undefined,
		spaceAggregationLabels: [],
		filterExpression: '',
	},
};

export const TEMPORAL_AGGREGATION_LINK =
	'https://signoz.io/docs/metrics-management/types-and-aggregation/#step-2-temporal-aggregation';

export const SPACE_AGGREGATION_LINK =
	'https://signoz.io/docs/metrics-management/types-and-aggregation/#step-3-spatial-aggregation';

export const GRAPH_CLICK_PIXEL_TOLERANCE = 10;
