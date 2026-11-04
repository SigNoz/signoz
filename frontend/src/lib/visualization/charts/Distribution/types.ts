import type { VariableWidthBar } from 'lib/uPlotV2/paths/variableWidthBars';
import type { HeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

export interface DistributionSeries {
	label: string;
	/** Group-by key → value, for drilling into this group. Empty when ungrouped. */
	groupLabels?: Record<string, string>;
	/** One count per bucket bound plus the trailing overflow, summed over the range. */
	counts: number[];
}

/** A click on a group's bar; never on Other, which no filter can name. */
export interface DistributionBarClick {
	series: DistributionSeries;
	color: string;
	/** Viewport coordinates of the click. */
	coordinates: { x: number; y: number };
}

export enum DistributionXScale {
	/** Linear for bounds spanning under two decades or linear bucketing, else the
	 *  heatmap's auto: log, floor-log for a zero bound, symlog for negatives. */
	Auto = 'auto',
	Linear = 'linear',
	Log = 'log',
	Symlog = 'symlog',
	/** Every bucket equally wide; ticks still name the bounds. */
	Ordinal = 'ordinal',
}

export enum DistributionYScale {
	Linear = 'linear',
	Log = 'log',
}

/** The bucket axis in x-scale space. The heatmap's row axis, laid sideways. */
export type DistributionXAxis = HeatmapYAxis;

/** `x` in bucket-axis units, `y` in counts (or percent); the overflow bucket is hatched. */
export interface DistributionBarRect extends VariableWidthBar {
	bucketIndex: number;
}
