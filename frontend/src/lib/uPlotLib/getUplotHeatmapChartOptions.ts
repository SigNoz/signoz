/* eslint-disable sonarjs/cognitive-complexity */
import { Color } from '@signozhq/design-tokens';
import {
	countsToFills,
	createDateFormatter,
	heatmapPaths,
} from 'container/PanelWrapper/heatmap';
import { Dimensions } from 'hooks/useDimensions';
import uPlot, { AlignedData } from 'uplot';

import onClickPlugin from './plugins/onClickPlugin';
import tooltipPlugin from './plugins/tooltipPlugin';
import { getXAxisScale } from './utils/getXAxisScale';

export interface GetUplotHeatmapChartOptionsProps {
	dimensions: Dimensions;
	isDarkMode: boolean;
	data: AlignedData;
	yAxisRange: { min: number; max: number };
	bucketLabels: string[];
	ySplits?: number[];
	timeBucketIntervalSec: number;
	heatmapColors: string[];
	yAxisUnit?: string;
	minTimeScale: number;
	maxTimeScale: number;
	timezone: string;
	enableDrillDown?: boolean;
	onDragSelect?: (startTime: number, endTime: number) => void;
	onClickHandler?: (...args: any[]) => void;
	queryResponse?: any;
	timeSeriesData?: any; // Original time series data for plugins
	bounds?: number[]; // Bucket bounds for plugins
	fieldNames?: string[];
}

/**
 * Calculate Y-axis size based on label widths
 */
function calculateYAxisSize(
	values: string[] | null,
	ctx: CanvasRenderingContext2D | null,
): number {
	const defaultSize = 60;

	if (!values?.length || !ctx) {
		return defaultSize;
	}

	const longestVal = values.reduce(
		(acc, val) => (val.length > acc.length ? val : acc),
		'',
	);

	if (!longestVal) {
		return defaultSize;
	}

	ctx.font = '12px system-ui, -apple-system, sans-serif';
	const textWidth = ctx.measureText(longestVal).width;

	return Math.ceil(textWidth / devicePixelRatio) + 25;
}

/**
 * Find bucket label for a given split value
 */
function findBucketLabel(splitValue: number, bucketLabels: string[]): string {
	const bucketIdx = Math.floor(splitValue);
	return bucketLabels[bucketIdx] || '';
}

/**
 * Generate uPlot options for heatmap visualization
 */
export function getUplotHeatmapChartOptions({
	dimensions,
	isDarkMode,
	data: _data,
	yAxisRange,
	bucketLabels,
	ySplits,
	timeBucketIntervalSec,
	heatmapColors,
	yAxisUnit,
	minTimeScale,
	maxTimeScale,
	timezone,
	enableDrillDown = false,
	onDragSelect,
	onClickHandler,
	queryResponse,
	timeSeriesData,
	bounds,
	fieldNames,
}: GetUplotHeatmapChartOptionsProps): uPlot.Options {
	const axisColor = isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400;
	const timeScaleProps = getXAxisScale(minTimeScale, maxTimeScale);
	const formatDate = createDateFormatter(timezone);

	// Create the display configuration for heatmap paths
	const disp = {
		fill: {
			lookup: heatmapColors,
			values: countsToFills(heatmapColors),
		},
	};

	// Hover state - minimal data to avoid GC pressure
	let hoveredTimeIdx = -1;
	let hoveredBucketIdx = -1;

	// Pre-computed cell lookup cache (rebuilt on setData/setSize)
	let cellCache: {
		xs: number[];
		yBinQty: number;
		xBinQty: number;
		counts: number[];
		// Pre-computed x positions for each time bucket (pixel coords)
		xPositions: number[];
		xSizes: number[];
		// Pre-computed y positions for each bucket (pixel coords)
		yPositions: number[];
		ySizes: number[];
	} | null = null;

	const buildCellCache = (u: uPlot): void => {
		const yData = u.data[1] as any;
		const ys = yData as number[];
		const xs = yData?.xs as number[];
		const counts = yData?.counts as number[];

		if (!xs || !ys || !counts || xs.length === 0) {
			cellCache = null;
			return;
		}

		const dlen = xs.length;
		const yBinQty = dlen - ys.lastIndexOf(ys[0]);
		if (!yBinQty || yBinQty <= 0) {
			cellCache = null;
			return;
		}
		const xBinQty = dlen / yBinQty;

		// Pre-compute x positions and sizes for each time bucket
		// Use actual tile width from heatmap rendering (same as heatmapPaths)
		const xBinIncr = xs[yBinQty] - xs[0];
		const xTileSize = Math.ceil(
			u.valToPos(xs[0] + xBinIncr, 'x') - u.valToPos(xs[0], 'x'),
		);

		const xPositions: number[] = [];
		const xSizes: number[] = [];
		for (let i = 0; i < xBinQty; i++) {
			const xStart = xs[i * yBinQty];
			xPositions.push(u.valToPos(xStart, 'x'));
			xSizes.push(xTileSize);
		}

		// Pre-compute y positions and sizes for each bucket
		const yPositions: number[] = [];
		const ySizes: number[] = [];
		for (let bi = 0; bi < yBinQty; bi++) {
			const yTop = u.valToPos(bi + 1, 'y');
			const yBottom = u.valToPos(bi, 'y');
			yPositions.push(Math.min(yTop, yBottom));
			ySizes.push(Math.ceil(Math.abs(yBottom - yTop)));
		}

		cellCache = {
			xs,
			yBinQty,
			xBinQty,
			counts,
			xPositions,
			xSizes,
			yPositions,
			ySizes,
		};
	};

	const hoverPlugin: uPlot.Plugin = {
		hooks: {
			ready: (u: uPlot): void => {
				buildCellCache(u);
			},
			setSize: (u: uPlot): void => {
				buildCellCache(u);
			},
			setData: (u: uPlot): void => {
				buildCellCache(u);
			},
			setCursor: (u: uPlot): void => {
				const left = u.cursor?.left;
				const top = u.cursor?.top;

				// Quick bounds check
				if (left == null || top == null || left < 0 || top < 0 || !cellCache) {
					if (hoveredTimeIdx !== -1) {
						hoveredTimeIdx = -1;
						hoveredBucketIdx = -1;
						u.over.style.cursor = 'default';
						u.redraw();
					}
					return;
				}

				const {
					xBinQty,
					yBinQty,
					counts,
					xPositions,
					xSizes,
					yPositions,
					ySizes,
				} = cellCache;

				// Binary search for time bucket (x) using pre-computed positions
				let timeIdx = -1;
				for (let i = 0; i < xBinQty; i++) {
					if (left >= xPositions[i] && left < xPositions[i] + xSizes[i]) {
						timeIdx = i;
						break;
					}
				}

				// Linear search for bucket (y) - usually small number of buckets
				let bucketIdx = -1;
				for (let i = 0; i < yBinQty; i++) {
					if (top >= yPositions[i] && top < yPositions[i] + ySizes[i]) {
						bucketIdx = i;
						break;
					}
				}

				// Check if we're in a valid cell with data
				if (timeIdx === -1 || bucketIdx === -1) {
					if (hoveredTimeIdx !== -1) {
						hoveredTimeIdx = -1;
						hoveredBucketIdx = -1;
						u.over.style.cursor = 'default';
						u.redraw();
					}
					return;
				}

				const flatIdx = timeIdx * yBinQty + bucketIdx;
				const count = counts[flatIdx] || 0;

				if (count <= 0) {
					if (hoveredTimeIdx !== -1) {
						hoveredTimeIdx = -1;
						hoveredBucketIdx = -1;
						u.over.style.cursor = 'default';
						u.redraw();
					}
					return;
				}

				// Only redraw if cell changed
				if (timeIdx !== hoveredTimeIdx || bucketIdx !== hoveredBucketIdx) {
					hoveredTimeIdx = timeIdx;
					hoveredBucketIdx = bucketIdx;
					u.over.style.cursor = 'pointer';
					u.redraw();
				}
			},
			draw: (u: uPlot): void => {
				if (hoveredTimeIdx === -1 || hoveredBucketIdx === -1 || !cellCache) {
					return;
				}
				const { xPositions, xSizes, yPositions, ySizes } = cellCache;
				const xPos = xPositions[hoveredTimeIdx];
				const yPos = yPositions[hoveredBucketIdx];
				const xSize = xSizes[hoveredTimeIdx];
				const ySize = ySizes[hoveredBucketIdx];

				const ctx = u.ctx;
				ctx.save();
				ctx.strokeStyle = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400;
				ctx.lineWidth = 1;
				ctx.strokeRect(
					Math.round(xPos + u.bbox.left),
					Math.round(yPos + u.bbox.top),
					xSize,
					ySize,
				);
				ctx.restore();
			},
		},
	};

	const plugins = [
		tooltipPlugin({
			apiResponse: undefined,
			yAxisUnit,
			isHeatmapChart: true,
			bucketLabels,
			isDarkMode,
			timezone,
			timeBucketIntervalSec,
			formatDate,
			heatmapColors,
		}),
		hoverPlugin,
	];

	// Add click plugin if drilldown is enabled
	if (enableDrillDown && onClickHandler) {
		const aggregateAttributeKey =
			fieldNames && fieldNames.length > 0 ? fieldNames.join(',') : undefined;

		plugins.push(
			onClickPlugin({
				onClick: onClickHandler,
				apiResponse: queryResponse as any,
				isHeatmap: true,
				bucketLabels,
				heatmapBounds: bounds,
				heatmapTimeSeriesData: timeSeriesData,
				aggregateAttributeKey,
			}),
		);
	}

	return {
		plugins,
		width: dimensions.width,
		height: dimensions.height || 300,
		cursor: {
			show: true,
			drag: {
				x: true,
				y: false,
			},
		},
		legend: { show: false },
		axes: [
			{
				gap: 10,
				stroke: axisColor,
				grid: { show: false },
			},
			{
				show: true,
				stroke: axisColor,
				grid: { show: false },
				splits: ySplits ? (): number[] => ySplits : undefined,
				values: (_u: uPlot, splits: number[]): string[] =>
					splits.map((split) => {
						const label = findBucketLabel(split, bucketLabels);
						if (yAxisUnit && yAxisUnit !== 'none') {
							return `${label} ${yAxisUnit}`;
						}
						return label;
					}),
				size: (self: uPlot, values: string[] | null): number =>
					calculateYAxisSize(values, self?.ctx || null),
			},
		],
		scales: {
			x: {
				...timeScaleProps,
			},
			y: {
				range: (): [number, number] => [yAxisRange.min, yAxisRange.max],
			},
		},
		series: [
			{ label: 'Time' },
			{
				facets: [
					{
						scale: 'x',
						auto: true,
					},
					{
						scale: 'y',
						auto: true,
					},
				],
				paths: heatmapPaths({ disp }),
				points: { show: false },
			},
		],
		hooks: {
			setSelect: [
				(u: uPlot): void => {
					// Handle drag selection for zoom
					if (!onDragSelect) {
						return;
					}

					const selection = u.select;
					if (selection) {
						const startTime = u.posToVal(selection.left, 'x');
						const endTime = u.posToVal(selection.left + selection.width, 'x');
						const diff = endTime - startTime;

						if (diff > 0) {
							onDragSelect(startTime * 1000, endTime * 1000);
						}
					}
				},
			],
		},
		tzDate: (timestamp: number): Date =>
			uPlot.tzDate(new Date(timestamp * 1e3), timezone),
	};
}
