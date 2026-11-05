import {
	type AxisProps,
	DistributionType,
	DrawStyle,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import {
	applyScatterPlugin,
	createScatterPlugin,
	SCATTER_FACETS,
} from 'lib/uPlotV2/plugins/ScatterPlugin/scatterPlugin';
import {
	DEFAULT_SCATTER_POINT_SIZE,
	ScatterChartData,
	ScatterSeriesData,
} from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import {
	logScaleSplits,
	spacedLogLabels,
} from 'lib/uPlotV2/utils/logGridSplits';
import { adjustSoftLimitsWithThresholds } from 'lib/uPlotV2/utils/scale';
import uPlot from 'uplot';

import { resolveAxisDistribution } from './axisDistribution';
import { createScatterRange } from './scatterRange';
import type {
	AxisDistribution,
	BuildScatterConfigArgs,
	ScatterAxisOptions,
	ScatterSeries,
} from './types';

const POINT_STROKE_WIDTH = 1;

/** Unit-suffixed x labels are wider than uPlot's 50px default assumes. */
const X_AXIS_TICK_SPACE_PX = 90;
const X_AXIS_END_LABEL_PADDING_PX = 40;

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

/** The scatter range is unsnapped, so a log axis places and labels its own ticks. */
function getLogAxisTicks({
	distribution,
}: AxisDistribution): Pick<AxisProps, 'splits' | 'filter'> {
	return distribution === DistributionType.Logarithmic
		? { splits: logScaleSplits, filter: spacedLogLabels }
		: {};
}

function getThresholdOptions(
	scaleKey: 'x' | 'y',
	{ thresholds, unit }: ScatterAxisOptions,
): ThresholdsDrawHookOptions | undefined {
	return thresholds && thresholds.length > 0
		? { scaleKey, thresholds, yAxisUnit: unit }
		: undefined;
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

	const xSoftLimits = adjustSoftLimitsWithThresholds(
		x.softMin ?? null,
		x.softMax ?? null,
		x.thresholds,
		x.unit,
	);
	const ySoftLimits = adjustSoftLimitsWithThresholds(
		y.softMin ?? null,
		y.softMax ?? null,
		y.thresholds,
		y.unit,
	);
	const xDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.xs),
		x.scale,
		[xSoftLimits.softMin, xSoftLimits.softMax],
	);
	const yDistribution = resolveAxisDistribution(
		series.flatMap((entry) => entry.ys),
		y.scale,
		[ySoftLimits.softMin, ySoftLimits.softMax],
	);

	const xThresholds = getThresholdOptions('x', x);
	const yThresholds = getThresholdOptions('y', y);

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
			...xSoftLimits,
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

	[xThresholds, yThresholds].forEach((options) => {
		if (options) {
			builder.addThresholds(options);
		}
	});

	return builder;
}
