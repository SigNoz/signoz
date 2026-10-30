import type { PrecisionOption } from 'components/Graph/types';
import type {
	DistributionType,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import type { Threshold } from 'lib/uPlotV2/hooks/types';
import type { ScatterPointSize } from 'lib/uPlotV2/plugins/ScatterPlugin/types';

export interface ScatterSeries {
	label: string;
	xs: number[];
	ys: number[];
	/** Optional third channel, in the caller's units. */
	sizes?: Array<number | null>;
}

export enum ScatterAxisScale {
	/** Log or symlog when it spreads the points out more than linear does. */
	Auto = 'auto',
	Linear = 'linear',
	Log = 'log',
	/** Log-like, but places zero and negatives. */
	SymLog = 'symlog',
}

export interface ScatterAxisOptions {
	label?: string;
	unit?: string;
	softMin?: number | null;
	softMax?: number | null;
	scale?: ScatterAxisScale;
	/** Lines drawn across the plot at values on this axis. */
	thresholds?: Threshold[];
}

export interface BuildScatterConfigArgs {
	id: string;
	series: ScatterSeries[];
	isDarkMode: boolean;
	x: ScatterAxisOptions;
	y: ScatterAxisOptions;
	pointSize?: ScatterPointSize;
	/** 0–1. */
	fillOpacity?: number;
	colorMapping?: Record<string, string>;
	decimalPrecision?: PrecisionOption;
	selectionPreferencesSource?: SelectionPreferencesSource;
	shouldSaveSelectionPreference?: boolean;
}

export interface AxisDistribution {
	distribution: DistributionType;
	asinhThreshold?: number;
}

export interface ScaleTransform {
	forward: (value: number) => number;
	inverse: (position: number) => number;
}

export interface ScatterRangeOptions extends AxisDistribution {
	dimension: 'x' | 'y';
	/** CSS pixels kept clear at each end so the largest dot draws whole. */
	marginPx: number;
	softMin?: number | null;
	softMax?: number | null;
}
