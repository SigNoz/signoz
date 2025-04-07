import { Color } from '@signozhq/design-tokens';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import {
	BarChart,
	BarChart2,
	BarChartHorizontal,
	Diff,
	Gauge,
	LucideProps,
} from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export const INSPECT_FEATURE_FLAG_KEY = 'metrics-explorer-inspect-feature-flag';

export const METRIC_TYPE_TO_COLOR_MAP: Record<MetricType, string> = {
	[MetricType.GAUGE]: Color.BG_SAKURA_500,
	[MetricType.HISTOGRAM]: Color.BG_SIENNA_500,
	[MetricType.SUM]: Color.BG_ROBIN_500,
	[MetricType.SUMMARY]: Color.BG_FOREST_500,
	[MetricType.EXPONENTIAL_HISTOGRAM]: Color.BG_AQUA_500,
};

export const METRIC_TYPE_TO_ICON_MAP: Record<
	MetricType,
	ForwardRefExoticComponent<
		Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
	>
> = {
	[MetricType.GAUGE]: Gauge,
	[MetricType.HISTOGRAM]: BarChart2,
	[MetricType.SUM]: Diff,
	[MetricType.SUMMARY]: BarChartHorizontal,
	[MetricType.EXPONENTIAL_HISTOGRAM]: BarChart,
};
