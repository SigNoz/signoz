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
const LEGEND_LINE_HEIGHT = 34;
const MAX_LEGEND_WIDTH = 400;

function avgLabelLength(labels: string[]): number {
	if (labels.length === 0) {
		return DEFAULT_AVG_LABEL_LENGTH;
	}
	return labels.reduce((sum, l) => sum + l.length, 0) / labels.length;
}

/**
 * Average text width from series labels (for legendsPerSet).
 */
export function calculateAverageTextWidth(labels: string[]): number {
	return avgLabelLength(labels) * AVG_CHAR_WIDTH;
}

/**
 * Chart and legend dimensions from container size and legend position.
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

	const avgLen = avgLabelLength(seriesLabels);
	const labelCount = seriesLabels.length;

	// Right legend: fixed column beside the chart; chart width shrinks
	if (legendConfig.position === LegendPosition.RIGHT) {
		const maxWidth = Math.min(400, containerWidth * 0.3);
		const estimated = 80 + AVG_CHAR_WIDTH * avgLen;
		const legendWidth = Math.min(Math.max(150, estimated), maxWidth);
		return {
			width: Math.max(0, containerWidth - legendWidth),
			height: containerHeight,
			legendWidth,
			legendHeight: containerHeight,
			legendsPerSet: 1,
		};
	}

	// Bottom legend: up to 2 rows below the chart; legend height is shared
	const rowHeight = LEGEND_LINE_HEIGHT + LEGEND_PADDING;
	const maxLegendHeight = Math.min(
		80,
		Math.max(containerHeight <= 400 ? 15 : 20, containerHeight * 0.15),
	);

	// How many legend items fit per row (by estimated item width)
	const itemWidth = Math.min(44 + AVG_CHAR_WIDTH * avgLen, 400);
	const itemsPerRow = Math.max(
		1,
		Math.floor((containerWidth - LEGEND_PADDING * 2) / itemWidth),
	);
	const rows = Math.min(2, Math.ceil(labelCount / itemsPerRow));

	// Ideal height for that many rows; cap by 2 rows and container-based max
	const idealHeight = rows > 1 ? rows * rowHeight - LEGEND_PADDING : rowHeight;
	const maxHeight = Math.min(2 * rowHeight, maxLegendHeight);
	const minHeight = rows <= 1 ? rowHeight : Math.min(2 * rowHeight, idealHeight);
	const heightFloor =
		containerHeight < 200 ? Math.min(minHeight, maxLegendHeight) : minHeight;
	const legendHeight = Math.max(heightFloor, Math.min(idealHeight, maxHeight));

	// How many items per row for the Legend component (chunking)
	const legendsPerSet = Math.ceil(
		(containerWidth + LEGEND_GAP) /
			(Math.min(MAX_LEGEND_WIDTH, avgLen * AVG_CHAR_WIDTH) + LEGEND_GAP),
	);

	return {
		width: containerWidth,
		height: Math.max(0, containerHeight - legendHeight),
		legendWidth: containerWidth,
		legendHeight,
		legendsPerSet,
	};
}
