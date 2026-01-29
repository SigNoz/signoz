import { PrecisionOption } from 'components/Graph/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import uPlot, { Cursor, Options, Series } from 'uplot';

/**
 * Base abstract class for all configuration builders
 * Provides a common interface for building uPlot configuration components
 */
export abstract class ConfigBuilder<P, T> {
	constructor(public props: P) {}

	/**
	 * Builds and returns the configuration object
	 */
	abstract getConfig(): T;

	/**
	 * Merges additional properties into the existing configuration
	 */
	merge?(props: Partial<P>): void;
}

/**
 * Props for configuring an axis
 */
export interface AxisProps {
	scaleKey: string;
	label?: string;
	show?: boolean;
	side?: 0 | 1 | 2 | 3; // top, right, bottom, left
	stroke?: string;
	grid?: {
		stroke?: string;
		width?: number;
		show?: boolean;
	};
	ticks?: {
		stroke?: string;
		width?: number;
		show?: boolean;
		size?: number;
	};
	values?: uPlot.Axis.Values;
	gap?: number;
	size?: uPlot.Axis.Size;
	formatValue?: (v: number) => string;
	space?: number; // Space for log scale axes
	isDarkMode?: boolean;
	isLogScale?: boolean;
	yAxisUnit?: string;
	panelType?: PANEL_TYPES;
	decimalPrecision?: PrecisionOption;
}

/**
 * Props for configuring a scale
 */

export enum DistributionType {
	Linear = 'linear',
	Logarithmic = 'logarithmic',
}

export interface ScaleProps {
	scaleKey: string;
	time?: boolean;
	min?: number | null;
	max?: number | null;
	softMin?: number | null;
	softMax?: number | null;
	thresholds?: UPlotThresholdOptions;
	padMinBy?: number;
	padMaxBy?: number;
	range?: uPlot.Scale.Range;
	auto?: boolean;
	logBase?: uPlot.Scale.LogBase;
	distribution?: DistributionType;
}

/**
 * Props for configuring a series
 */

export enum FillStyle {
	Solid = 'solid',
	Dash = 'dash',
	Dot = 'dot',
	Square = 'square',
}

export interface LineStyle {
	dash?: Array<number>;
	fill?: FillStyle;
}

export enum DrawStyle {
	Line = 'line',
	Points = 'points',
}

export enum LineInterpolation {
	Linear = 'linear',
	Spline = 'spline',
	StepAfter = 'stepAfter',
	StepBefore = 'stepBefore',
}

export enum VisibilityMode {
	Always = 'always',
	Auto = 'auto',
	Never = 'never',
}

export interface SeriesProps {
	scaleKey: string;
	label?: string;

	colorMapping: Record<string, string>;
	drawStyle: DrawStyle;
	pathBuilder?: Series.PathBuilder | null;
	pointsFilter?: Series.Points.Filter | null;
	pointsBuilder?: Series.Points.Show | null;
	show?: boolean;
	spanGaps?: boolean;

	isDarkMode?: boolean;

	// Line config
	lineColor?: string;
	lineInterpolation?: LineInterpolation;
	lineStyle?: LineStyle;
	lineWidth?: number;

	// Points config
	pointColor?: string;
	pointSize?: number;
	showPoints?: VisibilityMode;
}

export interface Threshold {
	thresholdValue: number;
	thresholdColor?: string;
	thresholdUnit?: string;
	thresholdLabel?: string;
}

export interface UPlotThresholdOptions {
	scaleKey: string;
	thresholds: Threshold[];
	yAxisUnit?: string;
}

export interface LegendItem {
	seriesIndex: number;
	label: uPlot.Series['label'];
	color: uPlot.Series['stroke'];
	visible: boolean;
}

export const DEFAULT_PLOT_CONFIG: Partial<Options> = {
	ms: 1,
	focus: {
		alpha: 0.3,
	},
	cursor: {
		focus: {
			prox: 30,
		},
	},
	legend: {
		show: false,
	},
	padding: [16, 16, 8, 8],
	series: [],
	hooks: {},
};

export const DEFAULT_CURSOR_CONFIG: Cursor = {
	drag: { setScale: true },
	points: {
		one: true,
		size: (u, seriesIdx) => (u.series[seriesIdx]?.points?.size ?? 0) * 3,
		width: (_u, _seriesIdx, size) => size / 4,
		stroke: (u, seriesIdx): string => {
			const points = u.series[seriesIdx]?.points;
			const strokeFn =
				typeof points?.stroke === 'function' ? points.stroke : undefined;
			const strokeValue =
				strokeFn !== undefined
					? strokeFn(u, seriesIdx)
					: typeof points?.stroke === 'string'
					? points.stroke
					: '';
			return `${strokeValue}90`;
		},
		fill: (): string => '#fff',
	},
	focus: {
		prox: 30,
	},
};
