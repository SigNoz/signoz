import { PrecisionOption } from 'components/Graph/types';
import uPlot, { Series } from 'uplot';

import { ThresholdsDrawHookOptions } from '../hooks/types';

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
 * Preferences source for the uPlot config builder
 */
export enum SelectionPreferencesSource {
	LOCAL_STORAGE = 'LOCAL_STORAGE',
	IN_MEMORY = 'IN_MEMORY',
}

/**
 * Props for configuring the uPlot config builder
 */
/** `Percent` rescales each x-slice to its column total, so every column fills to 100. */
export enum StackMode {
	None = 'none',
	Normal = 'normal',
	Percent = 'percent',
}

export interface ConfigBuilderProps {
	id: string;
	onDragSelect?: (startTime: number, endTime: number) => void;
	tzDate?: uPlot.LocalDateFromUnix;
	selectionPreferencesSource?: SelectionPreferencesSource;
	shouldSaveSelectionPreference?: boolean;
	stepInterval?: number;
}

/**
 * Props for configuring an axis
 */
export interface AxisProps {
	/** Scale this axis is drawn against — `'x'` / `'y'`, matching an `addScale` key. Also
	 * selects the default tick formatter and sizing (x: time, y: value + unit). */
	scaleKey: string;
	/** Axis title drawn alongside the ticks; omitted when there's nothing to name. */
	label?: string;
	/** Render the axis at all; false keeps the scale but draws no ticks or labels. */
	show?: boolean;
	/** Which edge of the plot the axis sits on: 0 | 1 | 2 | 3 — top, right, bottom, left. */
	side?: 0 | 1 | 2 | 3;
	/** Tick/label color. Defaults to black or white from `isDarkMode`. */
	stroke?: string;
	/** Partial override of the grid lines; unset keys fall back to the theme defaults. */
	grid?: {
		stroke?: string;
		width?: number;
		show?: boolean;
	};
	/** Partial override of the tick marks; provided as-is to uPlot when set. */
	ticks?: {
		stroke?: string;
		width?: number;
		show?: boolean;
		size?: number;
	};
	/** Explicit tick formatter, replacing the scale's default (time / unit-formatted). */
	values?: uPlot.Axis.Values;
	/** Explicit axis splits, overriding the default tick calculation. */
	splits?: uPlot.Axis.Splits;
	/** Pixels between the ticks and their labels; also feeds the y axis width calculation. */
	gap?: number;
	/** Explicit axis thickness. Left unset, the y axis sizes itself to its widest label. */
	size?: uPlot.Axis.Size;
	/** Minimum pixels between ticks, capping how many uPlot draws. For log scale axes. */
	space?: number;
	/** Picks the dark or light default for stroke and grid color. */
	isDarkMode?: boolean;
	/** Axis is on a log scale — thins the grid lines to keep dense decades readable. */
	isLogScale?: boolean;
	/** Unit the y axis ticks are formatted in (`spec.formatting.unit`). */
	yAxisUnit?: string;
	/**
	 * X axis carries timestamps, so its ticks format as dates/times. Declared by the caller
	 * rather than inferred from a panel type — a chart whose x axis is buckets or categories
	 * (histogram) leaves it off.
	 */
	isTimeAxis?: boolean;
	/** Decimal places for y axis tick values; unset lets the unit formatter decide. */
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
	min?: number;
	max?: number;
	softMin?: number;
	softMax?: number;
	thresholds?: ThresholdsDrawHookOptions;
	padMinBy?: number;
	padMaxBy?: number;
	range?: uPlot.Scale.Range;
	auto?: boolean;
	logBase?: uPlot.Scale.LogBase;
	distribution?: DistributionType;
}

export enum DisconnectedValuesMode {
	Never = 'never',
	Threshold = 'threshold',
}

/**
 * Props for configuring a series
 */

export enum LineStyle {
	Solid = 'solid',
	Dashed = 'dashed',
}

export enum DrawStyle {
	Line = 'line',
	Points = 'points',
	Bar = 'bar',
	Histogram = 'histogram',
}

export enum LineInterpolation {
	Linear = 'linear',
	Spline = 'spline',
	StepAfter = 'stepAfter',
	StepBefore = 'stepBefore',
}

/**
 * Props for configuring lines
 */
export interface LineConfig {
	lineColor?: string;
	lineInterpolation?: LineInterpolation;
	lineStyle?: LineStyle;
	lineWidth?: number;
	lineCap?: Series.Cap;
}

/**
 * Alignment of bars
 */
export enum BarAlignment {
	After = 1,
	Before = -1,
	Center = 0,
}

/**
 * Props for configuring bars
 */
export interface BarConfig {
	barAlignment?: BarAlignment;
	barMaxWidth?: number;
	barWidthFactor?: number;
}

/**
 * Props for configuring points
 */
export interface PointsConfig {
	pointColor?: string;
	pointSize?: number;
	showPoints?: boolean;
}

export enum FillMode {
	Solid = 'solid',
	Gradient = 'gradient',
	None = 'none',
}

export type ExtendedSeries = Series & {
	metric?: { [key: string]: string };
};

export interface SeriesProps extends LineConfig, PointsConfig, BarConfig {
	scaleKey: string;
	label?: string;
	colorMapping: Record<string, string>;
	drawStyle: DrawStyle;
	pathBuilder?: Series.PathBuilder;
	pointsFilter?: Series.Points.Filter;
	pointsBuilder?: Series.Points.Show;
	show?: boolean;
	/**
	 * Controls how nulls are treated for this series.
	 *
	 * - boolean: mapped directly to uPlot's spanGaps behavior
	 * - number: interpreted as an X-axis threshold (same unit as ref values),
	 *           where gaps smaller than this threshold are spanned by
	 *           converting short null runs to undefined during data prep
	 *           while uPlot's internal spanGaps is kept disabled.
	 */
	spanGaps?: boolean | number;
	fillColor?: string;
	fillMode?: FillMode;
	isDarkMode?: boolean;
	stepInterval?: number;
	metric?: { [key: string]: string };
}

export interface LegendItem {
	seriesIndex: number;
	label: uPlot.Series['label'];
	color: uPlot.Series['stroke'];
	show: boolean;
}
