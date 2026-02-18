import { PrecisionOption } from 'components/Graph/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import uPlot, { Cursor, Options, Series } from 'uplot';

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
export interface ConfigBuilderProps {
	widgetId?: string;
	onDragSelect?: (startTime: number, endTime: number) => void;
	tzDate?: uPlot.LocalDateFromUnix;
	selectionPreferencesSource?: SelectionPreferencesSource;
	shouldSaveSelectionPreference?: boolean;
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
	showPoints?: VisibilityMode;
}

export interface SeriesProps extends LineConfig, PointsConfig, BarConfig {
	scaleKey: string;
	label?: string;
	panelType: PANEL_TYPES;
	colorMapping: Record<string, string>;
	drawStyle: DrawStyle;
	pathBuilder?: Series.PathBuilder;
	pointsFilter?: Series.Points.Filter;
	pointsBuilder?: Series.Points.Show;
	show?: boolean;
	spanGaps?: boolean;
	fillColor?: string;
	isDarkMode?: boolean;
	stepInterval?: number;
}

export interface LegendItem {
	seriesIndex: number;
	label: uPlot.Series['label'];
	color: uPlot.Series['stroke'];
	show: boolean;
}

export const DEFAULT_PLOT_CONFIG: Partial<Options> = {
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

const POINTS_FILL_COLOR = '#FFFFFF';

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
		fill: (): string => POINTS_FILL_COLOR,
	},
	focus: {
		prox: 30,
	},
};
