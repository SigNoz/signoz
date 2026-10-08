import type { QuadtreeRect } from '../../utils/quadtree';

/** Diameters in CSS pixels. `min`/`max` bound the area scale when a size column is mapped. */
export interface ScatterPointSize {
	fixed: number;
	min: number;
	max: number;
}

export const DEFAULT_SCATTER_POINT_SIZE: ScatterPointSize = {
	fixed: 6,
	min: 4,
	max: 24,
};

/** CSS pixels around a point's disc that still register as a hover. */
export const DEFAULT_HOVER_TOLERANCE_PX = 3;

export interface ScatterPluginOptions {
	pointSize?: ScatterPointSize;
	hoverTolerance?: number;
}

/**
 * One faceted series: parallel columns, one point per index. Sizes are in the
 * caller's units and mapped to `pointSize` at draw time; `null` draws at `fixed`.
 */
export type ScatterSeriesData = [
	xs: number[],
	ys: number[],
	sizes?: Array<number | null>,
];

/** Mode-2 data: series 0 is uPlot's x placeholder and carries nothing. */
export type ScatterChartData = [null, ...ScatterSeriesData[]];

/** A drawn point's disc, in canvas pixels relative to the plot area. */
export interface ScatterHit extends QuadtreeRect {
	seriesIndex: number;
	dataIndex: number;
}

export interface ScatterChannel {
	label: string;
	unit?: string;
}

/** What each visual channel plots, for the tooltip and axes. */
export interface ScatterChannels {
	x: ScatterChannel;
	y: ScatterChannel;
	size?: ScatterChannel;
}

export interface ScatterPointLabel {
	key: string;
	value: string;
}
