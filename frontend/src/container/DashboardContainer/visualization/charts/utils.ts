import { LegendConfig, LegendPosition } from 'lib/uPlotV2/components/types';

export interface ChartDimensions {
	width: number;
	height: number;
	legendWidth: number;
	legendHeight: number;
	legendsPerSet: number;
}

const AVG_CHAR_WIDTH = 8;
const DEFAULT_AVG_LABEL_LENGTH = 15;
const LEGEND_GAP = 16;
const LEGEND_PADDING = 12;
const LEGEND_LINE_HEIGHT = 36;
const MAX_LEGEND_WIDTH = 400;

/**
 * Average text width from series labels (for legendsPerSet).
 */
export function calculateAverageLegendWidth(legends: string[]): number {
	if (legends.length === 0) {
		return DEFAULT_AVG_LABEL_LENGTH;
	}
	const averageLabelLength =
		legends.reduce((sum, l) => sum + l.length, 0) / legends.length;
	return averageLabelLength * AVG_CHAR_WIDTH;
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
 *   - `legendWidth` is clamped between 150px and min(MAX_LEGEND_WIDTH, 30% of container width).
 *   - Chart width is `containerWidth - legendWidth`.
 * - BOTTOM legend:
 *   - Computes how many items fit per row, then uses at most 2 rows.
 *   - `legendHeight` is derived from row count, capped by both a fixed pixel max and a % of container height.
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
			legendsPerSet: 0,
		};
	}

	// Approximate width of a single legend item based on label text.
	const approxLegendItemWidth = calculateAverageLegendWidth(seriesLabels);
	const legendItemCount = seriesLabels.length;

	if (legendConfig.position === LegendPosition.RIGHT) {
		const maxRightLegendWidth = Math.min(MAX_LEGEND_WIDTH, containerWidth * 0.3);
		const rightLegendWidth = Math.min(
			Math.max(150, approxLegendItemWidth),
			maxRightLegendWidth,
		);

		return {
			width: Math.max(0, containerWidth - rightLegendWidth),
			height: containerHeight,
			legendWidth: rightLegendWidth,
			legendHeight: containerHeight,
			// Single vertical list on the right.
			legendsPerSet: 1,
		};
	}

	const legendRowHeight = LEGEND_LINE_HEIGHT + LEGEND_PADDING;

	const legendItemWidth = Math.min(approxLegendItemWidth, 400);
	const legendItemsPerRow = Math.max(
		1,
		Math.floor((containerWidth - LEGEND_PADDING * 2) / legendItemWidth),
	);

	const legendRowCount = Math.min(
		2,
		Math.ceil(legendItemCount / legendItemsPerRow),
	);

	const idealBottomLegendHeight =
		legendRowCount > 1
			? legendRowCount * legendRowHeight - LEGEND_PADDING
			: legendRowHeight;

	const maxAllowedLegendHeight = Math.min(2 * legendRowHeight, 80);

	const bottomLegendHeight = Math.min(
		idealBottomLegendHeight,
		maxAllowedLegendHeight,
	);

	// How many legend items per row in the Legend component.
	const legendsPerSet = Math.ceil(
		(containerWidth + LEGEND_GAP) /
			(Math.min(MAX_LEGEND_WIDTH, approxLegendItemWidth) + LEGEND_GAP),
	);

	return {
		width: containerWidth,
		height: Math.max(0, containerHeight - bottomLegendHeight),
		legendWidth: containerWidth,
		legendHeight: bottomLegendHeight,
		legendsPerSet,
	};
}
