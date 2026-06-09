import { histogramBucketSizes } from '@grafana/data';
import { DEFAULT_BUCKET_COUNT } from 'container/PanelWrapper/constants';
import {
	buildHistogramBuckets,
	mergeAlignedDataTables,
	prependNullBinToFirstHistogramSeries,
	replaceUndefinedWithNullInAlignedData,
} from 'container/DashboardContainer/visualization/panels/utils/histogram';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { AlignedData } from 'uplot';
import { incrRoundDn, roundDecimals } from 'utils/round';

export interface PrepareHistogramDataArgs {
	payload: MetricRangePayloadProps | undefined;
	bucketWidth?: number;
	bucketCount?: number;
	mergeAllActiveQueries?: boolean;
}

const BUCKET_OFFSET = 0;
const sortAscending = (a: number, b: number): number => a - b;

/**
 * Bins raw series values into a uPlot-aligned histogram. Picks a bucket size
 * either from `bucketWidth` (explicit override) or the smallest predefined
 * Grafana bucket that fits the data's `range / bucketCount` target while
 * staying ≥ the data's smallest non-zero delta (so we never sub-divide below
 * the resolution of the input).
 *
 * Empty input → `[[]]` (a valid empty AlignedData uPlot accepts).
 */
export function prepareHistogramData({
	payload,
	bucketWidth,
	bucketCount = DEFAULT_BUCKET_COUNT,
	mergeAllActiveQueries = false,
}: PrepareHistogramDataArgs): AlignedData {
	if (!payload) {
		return [[]];
	}
	const result = payload.data.result;
	const values = extractNumericValues(result);
	if (values.length === 0) {
		return [[]];
	}

	const sorted = [...values].sort(sortAscending);
	const range = sorted[sorted.length - 1] - sorted[0];
	const smallestDelta = computeSmallestDelta(sorted);
	let bucketSize = selectBucketSize({
		range,
		bucketCount,
		smallestDelta,
		bucketWidthOverride: bucketWidth,
	});
	if (bucketSize <= 0) {
		bucketSize = range > 0 ? range / bucketCount : 1;
	}

	const getBucket = (v: number): number =>
		roundDecimals(incrRoundDn(v - BUCKET_OFFSET, bucketSize) + BUCKET_OFFSET, 9);

	const frames = buildFrames(result, mergeAllActiveQueries);
	// Merged mode folds every query into frame 0 and leaves trailing empty
	// frames — drop those. Per-query mode must keep one column per result row
	// (even empty queries), or the data column count drifts below the series
	// count `buildHistogramConfig` adds per row → uPlot renders nothing.
	const histograms: AlignedData[] = frames
		.filter((frame) => !mergeAllActiveQueries || frame.length > 0)
		.map((frame) => buildHistogramBuckets(frame, getBucket, sortAscending));

	if (histograms.length === 0) {
		return [[]];
	}

	const merged = mergeAlignedDataTables(histograms);
	replaceUndefinedWithNullInAlignedData(merged);
	prependNullBinToFirstHistogramSeries(merged, bucketSize);
	return merged;
}

function extractNumericValues(
	result: MetricRangePayloadProps['data']['result'],
): number[] {
	const values: number[] = [];
	for (const item of result) {
		for (const [, valueStr] of item.values) {
			values.push(Number.parseFloat(valueStr) || 0);
		}
	}
	return values;
}

function computeSmallestDelta(sortedValues: number[]): number {
	if (sortedValues.length <= 1) {
		return 0;
	}
	let smallest = Infinity;
	for (let i = 1; i < sortedValues.length; i++) {
		const delta = sortedValues[i] - sortedValues[i - 1];
		if (delta > 0) {
			smallest = Math.min(smallest, delta);
		}
	}
	return smallest === Infinity ? 0 : smallest;
}

function selectBucketSize({
	range,
	bucketCount,
	smallestDelta,
	bucketWidthOverride,
}: {
	range: number;
	bucketCount: number;
	smallestDelta: number;
	bucketWidthOverride?: number;
}): number {
	if (bucketWidthOverride != null && bucketWidthOverride > 0) {
		return bucketWidthOverride;
	}
	const targetSize = range / bucketCount;
	for (const candidate of histogramBucketSizes) {
		if (targetSize < candidate && candidate >= smallestDelta) {
			return candidate;
		}
	}
	return 0;
}

// When merging is on, fold all frames into the first; the trailing empty
// frames stay in the array so downstream `.filter(length > 0)` drops them.
function buildFrames(
	result: MetricRangePayloadProps['data']['result'],
	mergeAllActiveQueries: boolean,
): number[][] {
	const frames: number[][] = result.map((item) =>
		item.values.map(([, valueStr]) => Number.parseFloat(valueStr) || 0),
	);
	if (mergeAllActiveQueries && frames.length > 1) {
		const first = frames[0];
		for (let i = 1; i < frames.length; i++) {
			first.push(...frames[i]);
			frames[i] = [];
		}
	}
	return frames;
}
