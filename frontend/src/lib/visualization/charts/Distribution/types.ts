import type { VariableWidthBar } from 'lib/uPlotV2/paths/variableWidthBars';
import type { HeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

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

export interface DrawnGroups {
	labels: string[];
	counts: number[][];
	colors: string[];
	/** Each drawn group's index among the source series; `null` for Other. */
	sourceIndexes: (number | null)[];
	/** Source indexes of the visible groups summed into Other, largest first; empty when none were. */
	otherSourceIndexes: number[];
	/** Visible groups in all, drawn or folded. */
	visibleGroupCount: number;
}

export interface DistributionBarsLayout {
	/** One list per series, in series order. */
	rects: DistributionBarRect[][];
	/** Where every bar starts: 0, or the log axis base. */
	yMin: number;
	/** Top of the tallest bar inside the axis window, for the count axis range. */
	yMax: number;
}

export interface DistributionPercentile {
	/** 0–100, as configured. */
	percentile: number;
	/** The estimate; in overflow, the last finite bound it is known to exceed. */
	value: number;
	/** Where the marker is drawn, in x-scale space. */
	axisValue: number;
	isOverflow: boolean;
}

export interface HitRect {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/** A drawn marker's hover targets, in CSS pixels relative to the plot. */
export interface PercentileMarkerHitArea {
	x: number;
	badges: HitRect[];
}

export interface UseDistributionBarClickArgs {
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	drawn: DrawnGroups;
	series: DistributionSeries[];
	/** Each source series' colour, for a group picked out of Other. */
	colors: string[];
	onBarClick?: (click: DistributionBarClick) => void;
}

export interface UseDistributionBarClickReturn {
	onClick?: (data: ChartClickData) => void;
	/** True over the Other bar, whose click pins the tooltip so a group in it can be picked. */
	shouldPinOnClick?: (data: ChartClickData) => boolean;
	/** Drills into a group summed into Other, picked from the pinned tooltip. */
	onOtherMemberClick?: (
		sourceIndex: number,
		coordinates: { x: number; y: number },
	) => void;
}
