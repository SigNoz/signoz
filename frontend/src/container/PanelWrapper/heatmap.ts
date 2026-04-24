/* eslint-disable sonarjs/cognitive-complexity */
import { SeriesItem } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';
import { AlignedData } from 'uplot';

import { HEATMAP_COLOR_GRADIENTS } from './constants';

const { round } = Math;

export interface HeatmapProcessedData {
	bounds: number[];
	values: any[];
	originalSeries: SeriesItem;
	numBuckets: number;
	bucketLabels: string[];
	timeBucketIntervalSec: number;
	data: AlignedData;
	timeSeriesData: any;
	fieldNames: string[];
}

/**
 * Extract and process heatmap data from query response
 */
export function extractAndProcessHeatmapData(
	queryResponse: any,
	query?: any,
): HeatmapProcessedData | null {
	const results = queryResponse?.data?.payload?.data?.newResult?.data?.result;

	if (!results?.length) {
		return null;
	}

	// Find all series with heatmap structure (bounds + values arrays)
	const allSeries: SeriesItem[] = [];
	let firstBounds: number[] | undefined;

	for (const result of results) {
		if (!result?.series?.length) {
			continue;
		}

		for (const series of result.series) {
			if (!series.bounds || !Array.isArray(series.bounds)) {
				continue;
			}

			const firstValue = series.values?.[0] as any;
			if (!firstValue?.values || !Array.isArray(firstValue.values)) {
				continue;
			}

			const seriesBounds = series.bounds;

			if (!firstBounds) {
				firstBounds = seriesBounds;
				allSeries.push(series);
			} else if (
				seriesBounds.length === firstBounds.length &&
				seriesBounds.every(
					(bound: number, idx: number) => bound === firstBounds![idx],
				)
			) {
				allSeries.push(series);
			}
		}
	}

	if (!allSeries.length || !firstBounds) {
		return null;
	}

	// Merge multiple series by summing counts
	let finalValues: any[];

	if (allSeries.length === 1) {
		finalValues = allSeries[0].values as any;
	} else {
		const timestampMap = new Map<number, number[]>();

		allSeries.forEach((series) => {
			series.values.forEach((item: any) => {
				if (!item.timestamp || !item.values) {
					return;
				}

				const existing = timestampMap.get(item.timestamp);
				if (existing) {
					item.values.forEach((count: number, idx: number) => {
						existing[idx] = (existing[idx] || 0) + count;
					});
				} else {
					timestampMap.set(item.timestamp, [...item.values]);
				}
			});
		});

		const sortedTimestamps = Array.from(timestampMap.keys()).sort(
			(a, b) => a - b,
		);
		finalValues = sortedTimestamps.map((ts) => ({
			timestamp: ts,
			values: timestampMap.get(ts)!,
		}));
	}

	const sortedBounds = [...firstBounds].sort((a, b) => a - b);
	const numBuckets = Math.max(0, sortedBounds.length - 1);
	const bucketLabels = buildBucketLabels(sortedBounds, undefined, numBuckets);

	// Convert to uPlot format
	const timestamps = finalValues.map((v: any) => v.timestamp / 1000); // ms to seconds
	const counts = finalValues.map((v: any) => v.values || []);
	const [xs, ys, countsFlat] = convertToHeatmapData(
		timestamps,
		sortedBounds,
		counts,
	);

	const yData = ys as any;
	yData.counts = countsFlat;
	yData.xs = xs;
	yData.bounds = sortedBounds; // actual bucket boundaries for Y-axis scale and rendering
	const data = ([xs, yData] as unknown) as AlignedData;

	// Calculate time interval
	const timestampsMs = finalValues?.map((v: any) => v.timestamp) || [];
	const timeBucketIntervalSec =
		timestampsMs.length > 1 ? (timestampsMs[1] - timestampsMs[0]) / 1000 : 60;

	// Create timeSeriesData structure for plugins (with labels for drilldown)
	const timeSeriesData = {
		queryName: results[0]?.queryName || '',
		aggregations: [
			{
				series: [
					{
						labels: allSeries[0]?.labels || [],
						values: finalValues,
						bounds: sortedBounds,
					},
				],
			},
		],
	};

	const fieldNames: string[] = [];
	if (query?.builder?.queryData) {
		for (const queryData of query.builder.queryData) {
			if (queryData.aggregations && Array.isArray(queryData.aggregations)) {
				for (const agg of queryData.aggregations) {
					if ('expression' in agg && typeof agg.expression === 'string') {
						// Extract field name from heatmap(field_name, buckets) expression
						const match = agg.expression.match(/heatmap\(([^,]+)/);
						if (match) {
							fieldNames.push(match[1].trim());
						}
					}
				}
			}
			// Fallback to old format
			if (fieldNames.length === 0 && queryData.aggregateAttribute?.key) {
				fieldNames.push(queryData.aggregateAttribute.key);
			}
		}
	}

	return {
		bounds: sortedBounds,
		values: finalValues,
		originalSeries: allSeries[0],
		numBuckets,
		bucketLabels,
		timeBucketIntervalSec,
		data,
		timeSeriesData,
		fieldNames,
	};
}

export function convertToHeatmapData(
	timestamps: number[],
	bucketBounds: number[],
	counts: number[][],
): [number[], number[], number[]] {
	const numTimestamps = timestamps.length;
	// bounds has numBuckets+1 entries; lower bounds are bounds[0..numBuckets-1]
	const numBuckets = Math.max(0, bucketBounds.length - 1);

	const xs: number[] = [];
	const ys: number[] = [];
	const countsFlat: number[] = [];

	for (let ti = 0; ti < numTimestamps; ti++) {
		const timestamp = timestamps[ti];
		const timestampCounts = counts[ti] || [];

		for (let bi = 0; bi < numBuckets; bi++) {
			const count = timestampCounts[bi] || 0;
			xs.push(timestamp);
			ys.push(bucketBounds[bi]); // actual lower bound value
			countsFlat.push(count);
		}
	}

	return [xs, ys, countsFlat];
}

export function heatmapPaths(opts: {
	disp: {
		fill: {
			lookup: string[];
			values: (u: uPlot, seriesIdx: number) => number[];
		};
	};
}): uPlot.Series.PathBuilder {
	const { disp } = opts;

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	return (u: uPlot, seriesIdx: number) => {
		return uPlot.orient(
			u,
			seriesIdx,
			(
				_series,
				_dataX,
				dataY,
				scaleX,
				scaleY,
				valToPosX,
				valToPosY,
				xOff,
				yOff,
				xDim,
				yDim,
				_moveTo,
				_lineTo,
				rect,
			) => {
				if (!rect) {
					return null;
				}

				const yData = u.data[seriesIdx] as any;
				const ys = dataY as number[];
				const xs = yData?.xs as number[];
				const counts = yData?.counts as number[];
				const bounds = yData?.bounds as number[];

				const dlen = xs?.length || 0;

				if (dlen === 0 || !ys || ys.length === 0 || !counts || !xs) {
					return null;
				}

				// Get fill colors for each point
				const fills = disp.fill.values(u, seriesIdx);
				const fillPalette = disp.fill.lookup ?? [...new Set(fills)];
				const fillPaths = fillPalette.map(() => new Path2D());

				// Detect x and y bin quantities by detecting layout repetition
				const yBinQty = dlen - ys.lastIndexOf(ys[0]);
				const xBinQty = dlen / yBinQty;

				const xBinIncr =
					yBinQty < xs.length && Number.isFinite(xs[yBinQty])
						? xs[yBinQty] - xs[0]
						: 0;

				// Calculate tile sizes
				const xSize = Math.ceil(
					valToPosX(xBinIncr, scaleX, xDim, xOff) - valToPosX(0, scaleX, xDim, xOff),
				);

				// Y size: calculate using actual bucket boundaries
				const yScale = scaleY as any;
				const yMin = yScale.min ?? (bounds ? bounds[0] : 0);
				const yMax = yScale.max ?? (bounds ? bounds[bounds.length - 1] : yBinQty);
				const totalYRange = yMax - yMin;
				if (totalYRange <= 0) {
					return null;
				}

				// Pre-calculate tile positions using actual bound values
				const cys: number[] = [];
				const ySizes: number[] = [];
				for (let bi = 0; bi < yBinQty; bi++) {
					const lowerBound = bounds ? bounds[bi] : bi;
					const upperBound = bounds ? bounds[bi + 1] : bi + 1;
					const yTop = valToPosY(upperBound, scaleY, yDim, yOff);
					const yBottom = valToPosY(lowerBound, scaleY, yDim, yOff);
					const yPos = Math.min(yTop, yBottom);
					const ySize = Math.abs(yBottom - yTop);
					cys.push(round(yPos));
					ySizes.push(Math.ceil(ySize));
				}

				const cxs = Array.from({ length: xBinQty }, (_, i) =>
					round(valToPosX(xs[i * yBinQty], scaleX, xDim, xOff)),
				);

				// Build paths for each fill color
				for (let i = 0; i < dlen; i++) {
					if (fills[i] === -1) {
						continue;
					}

					// Filter out tiles outside viewport
					if (
						xs[i] >= (scaleX.min ?? -Infinity) &&
						xs[i] <= (scaleX.max ?? Infinity) &&
						ys[i] >= yMin &&
						ys[i] <= yMax
					) {
						const xIdx = ~~(i / yBinQty);
						const yIdx = i % yBinQty;
						const fillPath = fillPaths[fills[i]];
						if (fillPath) {
							rect(fillPath, cxs[xIdx], cys[yIdx], xSize, ySizes[yIdx]);
						}
					}
				}

				// Render all paths
				u.ctx.save();
				u.ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
				u.ctx.clip();

				fillPaths.forEach((p, i) => {
					if (p && fillPalette[i]) {
						u.ctx.fillStyle = fillPalette[i];
						u.ctx.fill(p);
					}
				});

				u.ctx.restore();

				return null;
			},
		);
	};
}

function interpolateColor(
	color1: [number, number, number],
	color2: [number, number, number],
	factor: number,
): string {
	const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
	const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
	const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
	return `rgb(${r},${g},${b})`;
}

export function generateHeatmapPalette(
	numColors: number,
	gradientStops?: Array<{ position: number; color: [number, number, number] }>,
): string[] {
	const stops = gradientStops || HEATMAP_COLOR_GRADIENTS.default;
	const palette: string[] = [];

	for (let i = 0; i < numColors; i++) {
		const position = i / (numColors - 1);

		let lowerStop = stops[0];
		let upperStop = stops[stops.length - 1];

		for (let j = 0; j < stops.length - 1; j++) {
			if (position >= stops[j].position && position <= stops[j + 1].position) {
				lowerStop = stops[j];
				upperStop = stops[j + 1];
				break;
			}
		}

		const range = upperStop.position - lowerStop.position;
		const factor = range > 0 ? (position - lowerStop.position) / range : 0;

		palette.push(interpolateColor(lowerStop.color, upperStop.color, factor));
	}

	return palette;
}

export function countsToFills(
	palette: string[],
): (u: uPlot, seriesIdx: number) => number[] {
	return (u: uPlot, seriesIdx: number): number[] => {
		const seriesData = u.data[seriesIdx] as any;
		const counts = seriesData.counts as number[];

		if (!counts) {
			return [];
		}

		const hideThreshold = 0;

		// Find min and max counts
		let minCount = Infinity;
		let maxCount = -Infinity;
		const validCounts: number[] = [];

		for (let i = 0; i < counts.length; i++) {
			if (counts[i] > hideThreshold) {
				minCount = Math.min(minCount, counts[i]);
				maxCount = Math.max(maxCount, counts[i]);
				validCounts.push(counts[i]);
			}
		}

		if (validCounts.length === 0) {
			return Array(counts.length).fill(-1);
		}

		const sortedCounts = [...validCounts].sort((a, b) => a - b);

		const paletteSize = palette.length;
		const indexedFills = Array(counts.length);

		for (let i = 0; i < counts.length; i++) {
			if (counts[i] <= hideThreshold) {
				indexedFills[i] = -1;
			} else if (minCount === maxCount) {
				indexedFills[i] = Math.floor(paletteSize / 2);
			} else {
				// Linear scale
				const linearScale = (counts[i] - minCount) / (maxCount - minCount);

				// Percentile scale
				const percentileRank =
					sortedCounts.filter((c) => c <= counts[i]).length / sortedCounts.length;

				const hybridScale = 0.5 * linearScale + 0.5 * percentileRank;

				indexedFills[i] = Math.min(
					paletteSize - 1,
					Math.floor(paletteSize * hybridScale),
				);
			}
		}

		return indexedFills;
	};
}

export function buildBucketLabels(
	bucketBounds: number[],
	_bucketStarts: number[] | undefined,
	numBuckets: number,
): string[] {
	const finalLabels: string[] = [];

	for (let i = 0; i < numBuckets; i++) {
		const start = bucketBounds[i];
		const end = bucketBounds[i + 1] ?? start;

		const label = end === start ? `${start}` : `${start}-${end}`;

		finalLabels.push(label);
	}

	return finalLabels;
}

export function generateYSplits(numBuckets: number): number[] {
	const maxLabels = Math.min(15, numBuckets);
	const customYSplits: number[] = [];

	if (numBuckets <= maxLabels) {
		// Show all buckets
		for (let i = 0; i < numBuckets; i++) {
			customYSplits.push(i);
		}
	} else {
		// Show evenly spaced labels
		const step = (numBuckets - 1) / (maxLabels - 1);
		for (let i = 0; i < maxLabels; i++) {
			customYSplits.push(Math.round(i * step));
		}
	}

	return customYSplits;
}

/**
 * Create a date formatter function for the given timezone
 */
export function createDateFormatter(timezone?: string): (ms: number) => string {
	const fmt = new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
		timeZone: timezone || undefined,
	});
	return (ms: number): string => fmt.format(new Date(ms));
}

/**
 * Get heatmap color palette based on widget configuration
 */
export function getHeatmapColors(
	heatmapColorPalette: string | undefined,
	colorGradients: Record<string, any>,
): string[] {
	const paletteKey = (heatmapColorPalette || 'default') as string;
	const gradient = colorGradients[paletteKey];

	if (gradient) {
		return generateHeatmapPalette(100, gradient as any);
	}

	return generateHeatmapPalette(100);
}
