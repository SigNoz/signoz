import {
	LEGEND_MAX_BOTTOM_ROWS,
	MIN_LEGEND_ITEM_WIDTH,
	LEGEND_COLUMN_GAP,
	LEGEND_TOOLBAR_GAP,
	LEGEND_TOOLBAR_HEIGHT,
	LEGEND_ITEM_EXTRA_WIDTH,
	LEGEND_ROW_GAP,
	LEGEND_ROW_HEIGHT,
	LEGEND_SCROLLER_PADDING_RIGHT,
	MAX_LEGEND_WIDTH,
} from 'lib/uPlotV2/components/Legend/constants';
import { LegendConfig, LegendPosition } from 'lib/uPlotV2/components/types';
export interface ChartDimensions {
	width: number;
	height: number;
	legendWidth: number;
	legendHeight: number;
	averageLegendWidth: number;
	/** For a BOTTOM legend that row's height is inside `legendHeight`. */
	showLegendSearch: boolean;
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
// Fits the toolbar's "Showing N of M series" readout plus the wrapper padding.
const MIN_RIGHT_LEGEND_WIDTH = 190;
// Past this the split inverts and the chart becomes the smaller half.
const RIGHT_LEGEND_FLOOR_RATIO = 0.5;

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
 *   - A grid overflowing those rows also gets a search row, whose height is
 *     part of `legendHeight`.
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
			showLegendSearch: false,
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
		// The column's chrome outranks the 40% share on a narrow panel.
		const floorWidth = Math.min(
			MIN_RIGHT_LEGEND_WIDTH,
			containerWidth * RIGHT_LEGEND_FLOOR_RATIO,
		);
		const rightLegendWidth = Math.min(
			Math.max(MIN_RIGHT_LEGEND_WIDTH, desiredLegendWidth),
			Math.max(floorWidth, maxRightLegendWidth),
		);

		return {
			width: Math.max(0, containerWidth - rightLegendWidth),
			height: containerHeight,
			legendWidth: rightLegendWidth,
			legendHeight: containerHeight,
			// Single vertical list on the right.
			averageLegendWidth: rightLegendWidth,
			showLegendSearch: legendItemCount > 0,
		};
	}

	const legendItemWidth = Math.ceil(
		Math.min(approxLegendItemWidth, MAX_LEGEND_WIDTH),
	);
	// Must resolve to the same track count as `.gridList`'s `auto-fill`; a more
	// generous one under-reserves rows and the grid's last row is clipped away.
	const gridWidth =
		containerWidth - LEGEND_PADDING * 2 - LEGEND_SCROLLER_PADDING_RIGHT;
	const legendItemsPerRow = Math.max(
		1,
		Math.floor(
			(gridWidth + LEGEND_COLUMN_GAP) /
				(legendItemWidth + LEGEND_ITEM_EXTRA_WIDTH + LEGEND_COLUMN_GAP),
		),
	);

	// The wrapper's bottom padding and the search row are inside this height.
	const heightForRows = (rowCount: number, withToolbar: boolean): number =>
		rowCount * LEGEND_ROW_HEIGHT +
		(rowCount - 1) * LEGEND_ROW_GAP +
		LEGEND_PADDING +
		(withToolbar ? LEGEND_TOOLBAR_HEIGHT + LEGEND_TOOLBAR_GAP : 0);

	const shortPanelBudget = containerHeight * MAX_SHORT_PANEL_LEGEND_RATIO;
	const gridRowCount = Math.ceil(legendItemCount / legendItemsPerRow);

	// Only once rows overflow — below that every series is already on screen —
	// and only while the row it costs leaves the legend inside the panel's share.
	const showLegendSearch =
		gridRowCount > LEGEND_MAX_BOTTOM_ROWS &&
		heightForRows(1, true) <= shortPanelBudget;

	const neededRowCount = Math.max(
		1,
		Math.min(LEGEND_MAX_BOTTOM_ROWS, gridRowCount),
	);

	// Without this, short grid panels hand most of their area to the legend and
	// the chart — the pie donut especially — collapses to a sliver. The dropped
	// row's items are clipped rather than removed, so they are scroll-only here.
	const legendRowCount =
		neededRowCount > 1 &&
		heightForRows(neededRowCount, showLegendSearch) > shortPanelBudget
			? 1
			: neededRowCount;

	const bottomLegendHeight = heightForRows(legendRowCount, showLegendSearch);

	return {
		width: containerWidth,
		height: Math.max(0, containerHeight - bottomLegendHeight),
		legendWidth: containerWidth,
		legendHeight: bottomLegendHeight,
		averageLegendWidth: legendItemWidth,
		showLegendSearch,
	};
}
