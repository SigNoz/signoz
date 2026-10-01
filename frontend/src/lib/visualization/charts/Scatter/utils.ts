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

import { createScatterRange } from './scatterRange';

/** Circle outline; the fill carries the colour. */
const POINT_STROKE_WIDTH = 1;

/** Unit-suffixed x labels are wider than uPlot's 50px default assumes. */
const X_AXIS_TICK_SPACE_PX = 90;
const X_AXIS_END_LABEL_PADDING_PX = 40;

export interface ScatterSeries {
	/** Group label, as the legend names it. */
	label: string;
	xs: number[];
	ys: number[];
	/** Optional third channel, in the caller's units. */
	sizes?: Array<number | null>;
}

export enum ScatterAxisScale {
	/** Log when the values are positive and span several decades, else linear. */
	Auto = 'auto',
	Linear = 'linear',
	Log = 'log',
	/** Log-like, but places zero and negatives. */
	SymLog = 'symlog',
}

/** Decades of positive values `auto` needs before it picks a log axis. */
export const AUTO_LOG_MIN_DECADES = 3;

export interface ScatterAxisOptions {
	/** Axis title. */
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

/**
 * The dot under the cursor, read off uPlot's cursor: the scatter plugin's
 * `dataIdx` answers only for the hit series, so its index is the one set.
 */
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
		...series.map(
			(entry): ScatterSeriesData =>
				entry.sizes ? [entry.xs, entry.ys, entry.sizes] : [entry.xs, entry.ys],
		),
	];
	return data as unknown as uPlot.AlignedData;
}

export interface AxisDistribution {
	distribution: DistributionType;
	asinhThreshold?: number;
}

function getPositiveRange(values: number[]): {
	minPositive: number;
	maxPositive: number;
	hasNonPositive: boolean;
} {
	let minPositive = Infinity;
	let maxPositive = -Infinity;
	let hasNonPositive = false;
	for (const value of values) {
		if (!Number.isFinite(value)) {
			continue;
		}
		if (value <= 0) {
			hasNonPositive = true;
		} else {
			minPositive = Math.min(minPositive, value);
			maxPositive = Math.max(maxPositive, value);
		}
	}
	return { minPositive, maxPositive, hasNonPositive };
}

/**
 * The symmetric log's linear band ends at the smallest non-zero magnitude, so
 * the small values still spread out.
 */
function symmetricLogDistribution(minPositive: number): AxisDistribution {
	const asinhThreshold = Number.isFinite(minPositive)
		? 10 ** Math.floor(Math.log10(minPositive))
		: 1;
	return { distribution: DistributionType.SymmetricLog, asinhThreshold };
}

/**
 * A plain log axis cannot place zero or negatives, so `log` falls back to the
 * symmetric log rather than lose those points; callers that would rather drop
 * them filter first.
 */
export function resolveAxisDistribution(
	values: number[],
	scale: ScatterAxisScale = ScatterAxisScale.Auto,
): AxisDistribution {
	const { minPositive, maxPositive, hasNonPositive } = getPositiveRange(values);
	switch (scale) {
		case ScatterAxisScale.Linear:
			return { distribution: DistributionType.Linear };
		case ScatterAxisScale.SymLog:
			return symmetricLogDistribution(minPositive);
		case ScatterAxisScale.Log:
			return hasNonPositive
				? symmetricLogDistribution(minPositive)
				: { distribution: DistributionType.Logarithmic };
		case ScatterAxisScale.Auto:
		default: {
			const spansDecades =
				Number.isFinite(minPositive) &&
				Math.log10(maxPositive / minPositive) >= AUTO_LOG_MIN_DECADES;
			return !hasNonPositive && spansDecades
				? { distribution: DistributionType.Logarithmic }
				: { distribution: DistributionType.Linear };
		}
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

	const xDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.xs),
		x.scale,
	);
	const yDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.ys),
		y.scale,
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
	const ySoftLimits = adjustSoftLimitsWithThresholds(
		y.softMin ?? null,
		y.softMax ?? null,
		thresholds,
		y.unit,
	);

	builder.addScale({
		scaleKey: 'x',
		time: false,
		softMin: x.softMin ?? undefined,
		softMax: x.softMax ?? undefined,
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
		softMin: y.softMin ?? undefined,
		softMax: y.softMax ?? undefined,
		thresholds: yThresholds,
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
