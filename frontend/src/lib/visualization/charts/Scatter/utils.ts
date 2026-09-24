import { PrecisionOption } from 'components/Graph/types';
import {
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
import uPlot from 'uplot';

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

export interface ScatterAxisOptions {
	unit?: string;
	softMin?: number | null;
	softMax?: number | null;
	isLogScale?: boolean;
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

/**
 * A log axis needs every value above zero; a rate that is sometimes 0 would drop
 * those points. Zero or negatives switch to a symmetric log whose linear band
 * ends at the smallest non-zero magnitude, so nothing is lost and the small
 * values still spread out.
 */
export function resolveAxisDistribution(
	values: number[],
	isLogScale?: boolean,
): AxisDistribution {
	if (!isLogScale) {
		return { distribution: DistributionType.Linear };
	}
	let minPositive = Infinity;
	let needsSymmetric = false;
	for (const value of values) {
		if (!Number.isFinite(value)) {
			continue;
		}
		if (value <= 0) {
			needsSymmetric = true;
		} else {
			minPositive = Math.min(minPositive, value);
		}
	}
	if (!needsSymmetric) {
		return { distribution: DistributionType.Logarithmic };
	}
	const asinhThreshold = Number.isFinite(minPositive)
		? 10 ** Math.floor(Math.log10(minPositive))
		: 1;
	return { distribution: DistributionType.SymmetricLog, asinhThreshold };
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
		x.isLogScale,
	);
	const yDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.ys),
		y.isLogScale,
	);

	const yThresholds =
		thresholds && thresholds.length > 0
			? { scaleKey: 'y', thresholds, yAxisUnit: y.unit }
			: undefined;

	builder.addScale({
		scaleKey: 'x',
		time: false,
		softMin: x.softMin ?? undefined,
		softMax: x.softMax ?? undefined,
		...xDistribution,
	});
	builder.addScale({
		scaleKey: 'y',
		time: false,
		softMin: y.softMin ?? undefined,
		softMax: y.softMax ?? undefined,
		thresholds: yThresholds,
		...yDistribution,
	});

	builder.addAxis({
		scaleKey: 'x',
		side: 2,
		isDarkMode,
		isTimeAxis: false,
		yAxisUnit: x.unit ?? '',
		decimalPrecision,
		isLogScale: xDistribution.distribution !== DistributionType.Linear,
		space: X_AXIS_TICK_SPACE_PX,
	});
	builder.addAxis({
		scaleKey: 'y',
		side: 3,
		isDarkMode,
		yAxisUnit: y.unit ?? '',
		decimalPrecision,
		isLogScale: yDistribution.distribution !== DistributionType.Linear,
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
