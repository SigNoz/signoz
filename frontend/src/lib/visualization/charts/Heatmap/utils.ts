import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { uPlotXAxisValuesFormat } from 'lib/uPlotLib/utils/constants';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import {
	decimateAxisSplits,
	formatRowLabel,
	resolveColumnAlignedSplits,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	createHeatmapHooks,
	HeatmapRenderOptions,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/heatmapPlugin';
import {
	HeatmapGrid,
	HeatmapYAxis,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import uPlot from 'uplot';

/** Minimum gap between y tick labels, in CSS pixels. */
const MIN_Y_TICK_GAP_PX = 18;

/** Label for the edge above the overflow row. */
const OVERFLOW_AXIS_LABEL = '∞';

const BOUNDARY_PRECISIONS: Array<
	Exclude<PrecisionOption, PrecisionOptionsEnum.FULL>
> = [0, 1, 2, 3, 4];

/** What `getYAxisFormattedValue` falls back to, so an unset precision starts
 *  where the panel renders. */
const DEFAULT_BOUNDARY_PRECISION = 2;

/**
 * Lowest precision, at or above the panel's, that prints every boundary
 * distinctly: `0.0625` and `0.0653` are both `0.06` at two decimals, and the rows
 * either side then claim the same range. Settles for the most precise candidate
 * when none separates every pair.
 */
export function resolveBoundaryPrecision({
	yAxis,
	yAxisUnit,
	decimalPrecision,
}: {
	yAxis: HeatmapYAxis;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}): PrecisionOption | undefined {
	if (decimalPrecision === PrecisionOptionsEnum.FULL) {
		return decimalPrecision;
	}

	// The overflow row's upper edge is the synthetic top of the grid, labelled `∞`.
	const boundaries = yAxis.rows
		.filter((row) => !row.isOverflow)
		.map((row) => row.upper);

	const floor = decimalPrecision ?? DEFAULT_BOUNDARY_PRECISION;
	const candidates = BOUNDARY_PRECISIONS.filter(
		(candidate) => candidate >= floor,
	);

	const separates = (candidate: PrecisionOption): boolean => {
		const labels = boundaries.map((boundary) =>
			getToolTipValue(String(boundary), yAxisUnit, candidate),
		);
		return labels.every(
			(label, index) => index === 0 || label !== labels[index - 1],
		);
	};

	return candidates.find(separates) ?? candidates[candidates.length - 1];
}

/**
 * Flattens the grid into `[timestamps, ...rows]`, one series per bucket row so
 * `setData` handles refetches. The series draw nothing; the renderer paints cells.
 *
 * Rows are padded to `rowCount` — which can differ from `bounds.length + 1` when
 * the response carried duplicate boundaries — since uPlot requires equal lengths.
 */
export function prepareHeatmapChartData(
	grid: HeatmapGrid,
	rowCount: number,
): uPlot.AlignedData {
	const columnCount = grid.timestamps.length;
	const rows = Array.from({ length: rowCount }, (_, row) => {
		const counts = grid.counts[row] ?? [];
		return Array.from({ length: columnCount }, (_, column) =>
			counts[column] === undefined ? null : counts[column],
		);
	});

	return [grid.timestamps, ...rows] as unknown as uPlot.AlignedData;
}

export interface BuildHeatmapConfigArgs extends Omit<
	HeatmapRenderOptions,
	'step'
> {
	id: string;
	grid: HeatmapGrid;
	/** Unit of the bucket boundaries; counts are never formatted with it. */
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	timezone?: Timezone;
	/** Query window, in seconds. Falls back to the grid's own extent. */
	minTimeScale?: number;
	maxTimeScale?: number;
	onDragSelect?: (startTime: number, endTime: number) => void;
}

export function buildHeatmapConfig({
	id,
	grid,
	yAxis,
	colors,
	isDarkMode,
	seriesColor,
	dimOnHover,
	onHoverChange,
	yAxisUnit,
	decimalPrecision,
	timezone,
	minTimeScale,
	maxTimeScale,
	onDragSelect,
}: BuildHeatmapConfigArgs): UPlotConfigBuilder {
	const tzDate = timezone
		? (timestamp: number): Date =>
				uPlot.tzDate(new Date(timestamp * 1e3), timezone.value)
		: undefined;

	const builder = new UPlotConfigBuilder({ id, onDragSelect, tzDate });

	// uPlot's focus picks the series closest in value space, meaningless when the
	// value is a colour; the renderer focuses the hovered row itself. alpha 1 keeps
	// that call off uPlot's full-redraw path.
	builder.setFocus({ alpha: 1 });
	builder.setCursor({ focus: { prox: -1 }, points: { show: false } });

	const formatBucketValue = (value: number): string =>
		getToolTipValue(String(value), yAxisUnit, decimalPrecision);

	const lastTimestamp = grid.timestamps[grid.timestamps.length - 1] ?? 0;
	const xRange: [number, number] = [
		minTimeScale ?? grid.timestamps[0] ?? 0,
		maxTimeScale ?? lastTimestamp + grid.step,
	];

	builder.addScale({
		scaleKey: 'x',
		time: true,
		range: (): [number, number] => xRange,
	});
	builder.addScale({
		scaleKey: 'y',
		time: false,
		auto: false,
		range: (): [number, number] => [yAxis.min, yAxis.max],
	});

	builder.addAxis({
		scaleKey: 'x',
		side: 2,
		isDarkMode,
		values: uPlotXAxisValuesFormat as uPlot.Axis.Values,
		// Grid lines are drawn on the ticks, so the ticks go on the cell edges.
		splits: (_self, _axisIdx, scaleMin, scaleMax, foundIncr): number[] =>
			resolveColumnAlignedSplits({
				anchor: grid.timestamps[0] ?? 0,
				step: grid.step,
				incr: foundIncr,
				min: scaleMin,
				max: scaleMax,
				toDate: tzDate,
			}),
	});

	// Ticks sit on row edges, so the overflow row is the band between the last
	// boundary and `∞`. A centre label would sit half a row from the boundary tick
	// and collide with it.
	const overflowRow = yAxis.rows[yAxis.rows.length - 1];
	const hasOverflowTick =
		yAxis.overflowSplit !== null && overflowRow?.isOverflow === true;
	const axisSplits = hasOverflowTick
		? [...yAxis.splits, yAxis.overflowSplit as number]
		: yAxis.splits;

	// From the boundaries themselves, not by inverting the transform:
	// 10 ** Math.log10(128) is 127.999…, which formats as "127.99".
	const splitLabels = new Map<number, string>();
	yAxis.splits.forEach((split, index) => {
		splitLabels.set(split, formatBucketValue(yAxis.rows[index].upper));
	});
	if (hasOverflowTick) {
		splitLabels.set(yAxis.overflowSplit as number, OVERFLOW_AXIS_LABEL);
	}

	builder.addAxis({
		scaleKey: 'y',
		side: 3,
		isDarkMode,
		yAxisUnit,
		decimalPrecision,
		// Thinned to whatever fits: a histogram can carry more boundaries than the
		// panel has room to label.
		splits: (self): number[] =>
			decimateAxisSplits({
				splits: axisSplits,
				min: yAxis.min,
				max: yAxis.max,
				plotHeight: self.bbox.height / uPlot.pxRatio,
				minGapPx: MIN_Y_TICK_GAP_PX,
			}),
		values: (_, splits): string[] =>
			splits.map(
				(split) =>
					splitLabels.get(split) ?? formatBucketValue(yAxis.toBucketValue(split)),
			),
	});

	yAxis.rows.forEach((row) => {
		builder.addSeries({
			scaleKey: 'y',
			// Nothing is stroked per series; the draw hook paints the grid.
			drawStyle: DrawStyle.Line,
			pathBuilder: (): null => null,
			showPoints: false,
			spanGaps: false,
			label: formatRowLabel(row, formatBucketValue),
			colorMapping: {},
			isDarkMode,
		});
	});

	const hooks = createHeatmapHooks({
		yAxis,
		step: grid.step,
		colors,
		isDarkMode,
		seriesColor,
		dimOnHover,
		onHoverChange,
	});

	// Order matters — see the HeatmapHooks doc comment.
	builder.addHook('init', hooks.init);
	builder.addHook('draw', hooks.draw);
	builder.addHook('setCursor', hooks.setCursor);
	builder.addHook('destroy', hooks.destroy);

	return builder;
}
