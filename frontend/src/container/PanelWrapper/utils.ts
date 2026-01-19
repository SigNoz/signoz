import { defaultStyles } from '@visx/tooltip';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const tooltipStyles = {
	...defaultStyles,
	minWidth: 60,
	backgroundColor: 'rgba(0,0,0,0.9)',
	color: 'white',
	zIndex: 9999,
	display: 'flex',
	gap: '10px',
	justifyContent: 'center',
	alignItems: 'center',
	padding: '5px 10px',
};

export const getLabel = (
	label: string,
	query: Query,
	queryName: string,
	isQueryContentMultipleResult = false, // If there are more than one aggregation return by the query, this should be set to true. Default is false.
): string => {
	let finalQuery;
	if (!isQueryContentMultipleResult) {
		finalQuery = query.builder.queryData.find((q) => q.queryName === queryName);
		if (!finalQuery) {
			// If the query is not found in queryData, then check in queryFormulas
			finalQuery = query.builder.queryFormulas.find(
				(q) => q.queryName === queryName,
			);
		}
	}
	if (finalQuery) {
		if (finalQuery.legend !== '') {
			return finalQuery.legend;
		}
		if (label !== undefined) {
			return label;
		}
		return queryName;
	}
	return label;
};

// Function to convert a hex color to RGB format
const hexToRgb = (
	color: string,
): { r: number; g: number; b: number } | null => {
	const hex = color.replace(
		/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
		(m, r, g, b) => r + r + g + g + b + b,
	);
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null;
};

export const lightenColor = (color: string, opacity: number): string => {
	// Convert the hex color to RGB format
	const rgbColor = hexToRgb(color);
	if (!rgbColor) return color; // Return the original color if unable to parse

	// Extract the RGB components
	const { r, g, b } = rgbColor;

	// Create a new RGBA color string with the specified opacity
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getTimeRangeFromUplotAxis = (
	axis: any,
	xValue: number,
): { startTime: number; endTime: number } => {
	let gap =
		(axis as any)._splits && (axis as any)._splits.length > 1
			? (axis as any)._splits[1] - (axis as any)._splits[0]
			: 600; // 10 minutes in seconds

	gap = Math.max(gap, 600); // Minimum gap of 10 minutes in seconds

	const startTime = xValue - gap;
	const endTime = xValue + gap;

	return { startTime, endTime };
};

export const isApmMetric = (metric = ''): boolean =>
	// if metric starts with 'signoz_', then it is an apm metric
	metric.startsWith('signoz_');

export const getTimeRangeFromStepInterval = (
	stepInterval: number,
	xValue: number,
	isApmMetric: boolean,
): { startTime: number; endTime: number } => {
	const startTime = isApmMetric ? xValue - stepInterval : xValue;
	const endTime = xValue + stepInterval;
	return { startTime, endTime };
};

export type FocusedHeatmap = {
	bucketEnds: number[];
	derivedStarts: number[];
	focusedCounts: number[][];
	minY: number;
	maxY: number;
};

const LOWER_PERCENTILE_THRESHOLD = 0.01;
const UPPER_PERCENTILE_THRESHOLD = 0.99;

// formatBucketValue function returns the formatted bucket value
export function formatBucketValue(val: number): string {
	if ((Math.abs(val) > 0 && Math.abs(val) < 0.01) || Math.abs(val) > 1e6) {
		return val.toExponential(2);
	}
	return val.toFixed(2);
}

// buildDerivedStarts function returns the derived starts for the given bucket ends
export function buildDerivedStarts(
	bucketEnds: number[],
	bucketStarts?: number[],
): number[] {
	if (bucketStarts?.length === bucketEnds.length) return bucketStarts;
	return bucketEnds.map((_, idx) => (idx === 0 ? 0 : bucketEnds[idx - 1]));
}

// computeBucketTotals function returns the bucket totals and the total count
export function computeBucketTotals(
	counts: number[][],
	bucketCount: number,
): { bucketTotals: number[]; total: number } {
	const bucketTotals = new Array(bucketCount).fill(0);
	let total = 0;

	for (let rowIndex = 0; rowIndex < counts.length; rowIndex += 1) {
		const row = counts[rowIndex] || [];
		const rowLen = Math.min(row.length, bucketTotals.length);
		for (let bucketIndex = 0; bucketIndex < rowLen; bucketIndex += 1) {
			const v = row[bucketIndex];
			if (Number.isFinite(v) && v > 0) {
				bucketTotals[bucketIndex] += v;
				total += v;
			}
		}
	}

	return { bucketTotals, total };
}

// findCumulativeIndex function returns the index of the bucketTotals array where the cumulative sum is greater than or equal to the target
export function findCumulativeIndex(
	bucketTotals: number[],
	target: number,
): number {
	let cum = 0;
	for (let i = 0; i < bucketTotals.length; i += 1) {
		cum += bucketTotals[i];
		if (cum >= target) return i;
	}
	return bucketTotals.length - 1;
}

// findNonZeroRange function returns the min and max index of the non zero values in the bucketTotals array
export function findNonZeroRange(
	bucketTotals: number[],
): { minIdx: number; maxIdx: number } {
	let minIdx = 0;
	let maxIdx = bucketTotals.length - 1;

	for (let i = 0; i < bucketTotals.length; i += 1) {
		if (bucketTotals[i] > 0) {
			minIdx = i;
			break;
		}
	}
	for (let i = bucketTotals.length - 1; i >= 0; i -= 1) {
		if (bucketTotals[i] > 0) {
			maxIdx = i;
			break;
		}
	}

	return { minIdx, maxIdx };
}

// focusHeatmap function returns the focused heatmap data
export function focusHeatmap(
	bucketEndsFull: number[],
	bucketStarts: number[] | undefined,
	counts: number[][],
): FocusedHeatmap {
	const derivedStartsFull = buildDerivedStarts(bucketEndsFull, bucketStarts);

	const { bucketTotals, total } = computeBucketTotals(
		counts,
		bucketEndsFull.length,
	);

	let minIdx = 0;
	let maxIdx = bucketEndsFull.length - 1;

	if (total > 0) {
		const lowerTarget = total * LOWER_PERCENTILE_THRESHOLD;
		const upperTarget = total * UPPER_PERCENTILE_THRESHOLD;

		const lowerIdx = findCumulativeIndex(bucketTotals, lowerTarget);
		let upperIdx = findCumulativeIndex(bucketTotals, upperTarget);

		if (upperIdx <= lowerIdx) {
			const nonZero = findNonZeroRange(bucketTotals);
			upperIdx = nonZero.maxIdx;
			minIdx = nonZero.minIdx;
			maxIdx = upperIdx;
		} else {
			minIdx = lowerIdx;
			maxIdx = upperIdx;
		}

		minIdx = Math.max(0, minIdx - 1);
		maxIdx = Math.min(bucketEndsFull.length - 1, maxIdx + 1);
	}

	const bucketEnds = bucketEndsFull.slice(minIdx, maxIdx + 1);
	const derivedStarts = derivedStartsFull.slice(minIdx, maxIdx + 1);
	const focusedCounts = counts.map((row) =>
		(row || []).slice(minIdx, maxIdx + 1),
	);

	const minY = derivedStarts[0] ?? bucketEnds[0];
	let actualMaxIdx = bucketEnds.length - 1;
	for (let i = bucketEnds.length - 1; i >= 0; i -= 1) {
		const hasData = focusedCounts.some((row) => (row[i] ?? 0) > 0);
		if (hasData) {
			actualMaxIdx = i;
			break;
		}
	}
	const maxY = bucketEnds[actualMaxIdx];

	return { bucketEnds, derivedStarts, focusedCounts, minY, maxY };
}
