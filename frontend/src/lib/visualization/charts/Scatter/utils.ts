import { PrecisionOption } from 'components/Graph/types';
import {
	type AxisProps,
	DistributionType,
	DrawStyle,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { Threshold } from 'lib/uPlotV2/hooks/types';
import {
	applyScatterPlugin,
	createScatterPlugin,
	SCATTER_FACETS,
} from 'lib/uPlotV2/plugins/ScatterPlugin/scatterPlugin';
import {
	DEFAULT_SCATTER_POINT_SIZE,
	ScatterChartData,
	ScatterPointSize,
	ScatterSeriesData,
} from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import {
	logScaleSplits,
	spacedLogLabels,
} from 'lib/uPlotV2/utils/logGridSplits';
import { adjustSoftLimitsWithThresholds } from 'lib/uPlotV2/utils/scale';
import uPlot from 'uplot';

import { createScatterRange, getScaleTransform } from './scatterRange';

const POINT_STROKE_WIDTH = 1;

/** Unit-suffixed x labels are wider than uPlot's 50px default assumes. */
const X_AXIS_TICK_SPACE_PX = 90;
const X_AXIS_END_LABEL_PADDING_PX = 40;

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
	/** Drawn on the y axis. */
	thresholds?: Threshold[];
	decimalPrecision?: PrecisionOption;
	selectionPreferencesSource?: SelectionPreferencesSource;
	shouldSaveSelectionPreference?: boolean;
}

/** The plugin's `dataIdx` answers only for the hit series. */
export function getCursorHit(
	plot: uPlot,
): { seriesIndex: number; dataIndex: number } | null {
	const idxs = plot.cursor.idxs ?? [];
	for (let seriesIndex = 1; seriesIndex < idxs.length; seriesIndex++) {
		const dataIndex = idxs[seriesIndex];
		if (dataIndex != null) {
			return { seriesIndex, dataIndex };
		}
	}
	return null;
}

/** `[null, [xs, ys, sizes?], …]`: uPlot's faceted layout, series 0 empty. */
export function prepareScatterChartData(
	series: ScatterSeries[],
): uPlot.AlignedData {
	const data: ScatterChartData = [
		null,
		...series.map((entry): ScatterSeriesData =>
			entry.sizes ? [entry.xs, entry.ys, entry.sizes] : [entry.xs, entry.ys],
		),
	];
	return data as unknown as uPlot.AlignedData;
}

export interface AxisDistribution {
	distribution: DistributionType;
	asinhThreshold?: number;
}

const LINEAR_DISTRIBUTION: AxisDistribution = {
	distribution: DistributionType.Linear,
};

/** Orders of magnitude `auto` needs before it considers leaving linear. */
export const AUTO_MIN_DECADES = 2;

/** How many times more axis the middle half of the points must cover for `auto` to leave linear. */
export const AUTO_SPREAD_GAIN = 2;

function getMagnitudeRange(values: number[]): {
	minMagnitude: number;
	maxMagnitude: number;
	hasNonPositive: boolean;
} {
	let minMagnitude = Infinity;
	let maxMagnitude = -Infinity;
	let hasNonPositive = false;
	for (const value of values) {
		if (!Number.isFinite(value)) {
			continue;
		}
		if (value <= 0) {
			hasNonPositive = true;
		}
		if (value !== 0) {
			minMagnitude = Math.min(minMagnitude, Math.abs(value));
			maxMagnitude = Math.max(maxMagnitude, Math.abs(value));
		}
	}
	return { minMagnitude, maxMagnitude, hasNonPositive };
}

/** The linear band ends at the smallest non-zero magnitude so small values still spread. */
function symmetricLogDistribution(minMagnitude: number): AxisDistribution {
	const asinhThreshold = Number.isFinite(minMagnitude)
		? 10 ** Math.floor(Math.log10(minMagnitude))
		: 1;
	return { distribution: DistributionType.SymmetricLog, asinhThreshold };
}

function quantile(sorted: number[], q: number): number {
	const position = (sorted.length - 1) * q;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Share of the axis the middle half of the points covers. */
function middleHalfSpread(
	sorted: number[],
	[min, max]: [number, number],
	distribution: AxisDistribution,
): number {
	const { forward } = getScaleTransform(distribution);
	const span = forward(max) - forward(min);
	return span > 0
		? (forward(quantile(sorted, 0.75)) - forward(quantile(sorted, 0.25))) / span
		: 0;
}

/**
 * Log (symlog with zero or negatives) when it spreads the points out clearly
 * more than linear does; min/max alone would let one outlier decide.
 */
function resolveAutoDistribution(
	values: number[],
	softLimits: number[],
): AxisDistribution {
	const sorted = values
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => a - b);
	if (sorted.length < 2) {
		return LINEAR_DISTRIBUTION;
	}
	const { minMagnitude, maxMagnitude, hasNonPositive } = getMagnitudeRange([
		...sorted,
		...softLimits,
	]);
	if (!(Math.log10(maxMagnitude / minMagnitude) >= AUTO_MIN_DECADES)) {
		return LINEAR_DISTRIBUTION;
	}
	const candidate = hasNonPositive
		? symmetricLogDistribution(minMagnitude)
		: { distribution: DistributionType.Logarithmic };
	const extent: [number, number] = [
		Math.min(sorted[0], ...softLimits),
		Math.max(sorted[sorted.length - 1], ...softLimits),
	];
	const candidateSpread = middleHalfSpread(sorted, extent, candidate);
	const linearSpread = middleHalfSpread(sorted, extent, LINEAR_DISTRIBUTION);
	return candidateSpread > 0 &&
		candidateSpread >= AUTO_SPREAD_GAIN * linearSpread
		? candidate
		: LINEAR_DISTRIBUTION;
}

/** `log` falls back to symlog rather than drop zero or negatives; callers filter first to drop them. */
export function resolveAxisDistribution(
	values: number[],
	scale: ScatterAxisScale = ScatterAxisScale.Auto,
	/** Soft limits and thresholds the axis must reach; only `auto` weighs them. */
	softLimits: Array<number | null | undefined> = [],
): AxisDistribution {
	switch (scale) {
		case ScatterAxisScale.Linear:
			return LINEAR_DISTRIBUTION;
		case ScatterAxisScale.SymLog:
			return symmetricLogDistribution(getMagnitudeRange(values).minMagnitude);
		case ScatterAxisScale.Log: {
			const { minMagnitude, hasNonPositive } = getMagnitudeRange(values);
			return hasNonPositive
				? symmetricLogDistribution(minMagnitude)
				: { distribution: DistributionType.Logarithmic };
		}
		case ScatterAxisScale.Auto:
		default:
			return resolveAutoDistribution(
				values,
				softLimits.filter(
					(limit): limit is number => limit != null && Number.isFinite(limit),
				),
			);
	}
}

/** The scatter range is unsnapped, so a log axis places and labels its own ticks. */
function getLogAxisTicks({
	distribution,
}: AxisDistribution): Pick<AxisProps, 'splits' | 'filter'> {
	return distribution === DistributionType.Logarithmic
		? { splits: logScaleSplits, filter: spacedLogLabels }
		: {};
}

export function buildScatterConfig({
	id,
	series,
	isDarkMode,
	x,
	y,
	pointSize = DEFAULT_SCATTER_POINT_SIZE,
	fillOpacity,
	colorMapping = {},
	thresholds,
	decimalPrecision,
	selectionPreferencesSource,
	shouldSaveSelectionPreference,
}: BuildScatterConfigArgs): UPlotConfigBuilder {
	const builder = new UPlotConfigBuilder({
		id,
		selectionPreferencesSource,
		shouldSaveSelectionPreference,
	});

	const plugin = createScatterPlugin({ pointSize });
	applyScatterPlugin(builder, plugin);
	// The last x label is centred on the plot's right edge; room for its unit.
	builder.setPadding([16, X_AXIS_END_LABEL_PADDING_PX, 8, 8]);

	const ySoftLimits = adjustSoftLimitsWithThresholds(
		y.softMin ?? null,
		y.softMax ?? null,
		thresholds,
		y.unit,
	);
	const xDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.xs),
		x.scale,
		[x.softMin, x.softMax],
	);
	const yDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.ys),
		y.scale,
		[ySoftLimits.softMin, ySoftLimits.softMax],
	);

	const yThresholds =
		thresholds && thresholds.length > 0
			? { scaleKey: 'y', thresholds, yAxisUnit: y.unit }
			: undefined;

	// The largest disc drawn, plus its outline, kept clear of each plot edge.
	const largestDiameter = series.some((entry) => entry.sizes)
		? pointSize.max
		: pointSize.fixed;
	const marginPx = largestDiameter / 2 + POINT_STROKE_WIDTH;

	builder.addScale({
		scaleKey: 'x',
		time: false,
		range: createScatterRange({
			dimension: 'x',
			marginPx,
			softMin: x.softMin,
			softMax: x.softMax,
			...xDistribution,
		}),
		...xDistribution,
	});
	builder.addScale({
		scaleKey: 'y',
		time: false,
		range: createScatterRange({
			dimension: 'y',
			marginPx,
			...ySoftLimits,
			...yDistribution,
		}),
		...yDistribution,
	});

	builder.addAxis({
		scaleKey: 'x',
		side: 2,
		label: x.label || undefined,
		isDarkMode,
		isTimeAxis: false,
		yAxisUnit: x.unit ?? '',
		decimalPrecision,
		isLogScale: xDistribution.distribution !== DistributionType.Linear,
		...getLogAxisTicks(xDistribution),
		space: X_AXIS_TICK_SPACE_PX,
	});
	builder.addAxis({
		scaleKey: 'y',
		side: 3,
		label: y.label || undefined,
		isDarkMode,
		yAxisUnit: y.unit ?? '',
		decimalPrecision,
		isLogScale: yDistribution.distribution !== DistributionType.Linear,
		...getLogAxisTicks(yDistribution),
	});

	series.forEach((entry) => {
		builder.addSeries({
			scaleKey: 'y',
			label: entry.label,
			colorMapping,
			drawStyle: DrawStyle.Scatter,
			pathBuilder: plugin.pathBuilder,
			facets: SCATTER_FACETS,
			lineWidth: POINT_STROKE_WIDTH,
			pointSize: pointSize.fixed,
			fillOpacity,
			isDarkMode,
		});
	});

	if (yThresholds) {
		builder.addThresholds(yThresholds);
	}

	return builder;
}
