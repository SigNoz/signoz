import {
	LEGEND_MAX_BOTTOM_ROWS,
	MIN_LEGEND_ITEM_WIDTH,
	LEGEND_ROW_GAP,
	LEGEND_ROW_HEIGHT,
	MAX_LEGEND_WIDTH,
} from 'lib/uPlotV2/components/Legend/constants';
import { LegendConfig, LegendPosition } from 'lib/uPlotV2/components/types';
export interface ChartDimensions {
	width: number;
	height: number;
	legendWidth: number;
	legendHeight: number;
	averageLegendWidth: number;
}

const AVG_CHAR_WIDTH = 8;
const LEGEND_WIDTH_PERCENTILE = 0.85;
const DEFAULT_AVG_LABEL_LENGTH = 15;
const BASE_LEGEND_WIDTH = 16;
const LEGEND_PADDING = 12;
// Two rows are worth having, but not at the cost of half the panel.
const MAX_SHORT_PANEL_LEGEND_RATIO = 0.5;

// RIGHT legend is a vertical column with its own width budget (cap protects the donut).
const MAX_RIGHT_LEGEND_WIDTH = 320;
const RIGHT_LEGEND_WIDTH_RATIO = 0.4;
// Column padding + copy button, not covered by the text-length estimate.
const RIGHT_LEGEND_RESERVED_WIDTH = 40;

/**
 * Calculates the average width of the legend items based on the labels of the series.
 * Never returns less than a legend row needs to hold its own hover actions.
 * @param legends - The labels of the series.
 * @returns The average width of the legend items.
 */
export function calculateAverageLegendWidth(legends: string[]): number {
	if (legends.length === 0) {
		return Math.max(
			MIN_LEGEND_ITEM_WIDTH,
			DEFAULT_AVG_LABEL_LENGTH * AVG_CHAR_WIDTH,
		);
	}

	const lengths = legends.map((l) => l.length).sort((a, b) => a - b);

	const index = Math.ceil(LEGEND_WIDTH_PERCENTILE * lengths.length) - 1;
	const percentileLength = lengths[Math.max(0, index)];

	return Math.max(
		MIN_LEGEND_ITEM_WIDTH,
		BASE_LEGEND_WIDTH + percentileLength * AVG_CHAR_WIDTH,
	);
}

/**
 * Compute how much space to give to the chart area vs. the legend.
 *
 * - For a RIGHT legend, we reserve a vertical column on the right and shrink the chart width.
 * - For a BOTTOM legend, we reserve up to two rows below the chart and shrink the chart height.
 *
 * Implementation details (high level):
 * - Approximates legend item width from label text length, using a fixed average char width.
 * - RIGHT legend:
 *   - `legendWidth` fits the longest label, clamped to [150px, min(MAX_RIGHT_LEGEND_WIDTH, 40% width)].
 *   - Chart width is `containerWidth - legendWidth`.
 * - BOTTOM legend:
 *   - Computes how many items fit per row, then uses at most 2 rows.
 *   - `legendHeight` is exactly those rows plus the wrapper's bottom padding, so
 *     the rectangle never clips a row or reserves space for half of one. Two
 *     rows that would take half a short panel fall back to one row.
 *   - Chart height is `containerHeight - legendHeight`, never below 0.
 * - `legendsPerSet` is the number of legend items that fit horizontally, based on the same text-width approximation.
 *
 * The returned values are the final chart and legend rectangles (width/height),
 * plus `legendsPerSet` which hints how many legend items to show per row.
 */
export function calculateChartDimensions({
	containerWidth,
	containerHeight,
	legendConfig,
	seriesLabels,
}: {
	containerWidth: number;
	containerHeight: number;
	legendConfig: LegendConfig;
	seriesLabels: string[];
}): ChartDimensions {
	// Guard: no space to lay out chart or legend
	if (containerWidth <= 0 || containerHeight <= 0) {
		return {
			width: 0,
			height: 0,
			legendWidth: 0,
			legendHeight: 0,
			averageLegendWidth: 0,
		};
	}

	// Approximate width of a single legend item based on label text.
	const approxLegendItemWidth = calculateAverageLegendWidth(seriesLabels);
	const legendItemCount = seriesLabels.length;

	if (legendConfig.position === LegendPosition.RIGHT) {
		// Size the column to the longest name (up to the cap) so it doesn't ellipsize.
		const longestLabelLength = seriesLabels.reduce(
			(max, label) => Math.max(max, label.length),
			0,
		);
		const desiredLegendWidth =
			BASE_LEGEND_WIDTH +
			longestLabelLength * AVG_CHAR_WIDTH +
			RIGHT_LEGEND_RESERVED_WIDTH;

		const maxRightLegendWidth = Math.min(
			MAX_RIGHT_LEGEND_WIDTH,
			containerWidth * RIGHT_LEGEND_WIDTH_RATIO,
		);
		const rightLegendWidth = Math.min(
			Math.max(150, desiredLegendWidth),
			maxRightLegendWidth,
		);

		return {
			width: Math.max(0, containerWidth - rightLegendWidth),
			height: containerHeight,
			legendWidth: rightLegendWidth,
			legendHeight: containerHeight,
			// Single vertical list on the right.
			averageLegendWidth: rightLegendWidth,
		};
	}

	const legendItemWidth = Math.ceil(
		Math.min(approxLegendItemWidth, MAX_LEGEND_WIDTH),
	);
	const legendItemsPerRow = Math.max(
		1,
		Math.floor((containerWidth - LEGEND_PADDING * 2) / legendItemWidth),
	);

	// The wrapper's bottom padding is inside this height (border-box).
	const heightForRows = (rowCount: number): number =>
		rowCount * LEGEND_ROW_HEIGHT +
		(rowCount - 1) * LEGEND_ROW_GAP +
		LEGEND_PADDING;

	const neededRowCount = Math.max(
		1,
		Math.min(
			LEGEND_MAX_BOTTOM_ROWS,
			Math.ceil(legendItemCount / legendItemsPerRow),
		),
	);

	// Without this, short grid panels hand most of their area to the legend and
	// the chart — the pie donut especially — collapses to a sliver. Dropping a
	// whole row beats clipping one.
	const legendRowCount =
		neededRowCount > 1 &&
		heightForRows(neededRowCount) > containerHeight * MAX_SHORT_PANEL_LEGEND_RATIO
			? 1
			: neededRowCount;

	const bottomLegendHeight = heightForRows(legendRowCount);

	return {
		width: containerWidth,
		height: Math.max(0, containerHeight - bottomLegendHeight),
		legendWidth: containerWidth,
		legendHeight: bottomLegendHeight,
		averageLegendWidth: legendItemWidth,
	};
}
