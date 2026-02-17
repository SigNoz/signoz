import {
	NULL_EXPAND,
	NULL_REMOVE,
	NULL_RETAIN,
} from 'container/PanelWrapper/constants';
import { AlignedData } from 'uplot';

/**
 * Expands contiguous runs of `null` values to the left and right of their
 * original positions so that visual gaps in the series are continuous.
 *
 * This is used when `NULL_EXPAND` mode is selected while joining series.
 */
function propagateNullsAcrossNeighbors(
	seriesValues: Array<number | null>,
	nullIndices: number[],
	alignedLength: number,
): void {
	for (
		let i = 0, currentIndex, lastExpandedNullIndex = -1;
		i < nullIndices.length;
		i++
	) {
		const nullIndex = nullIndices[i];

		if (nullIndex > lastExpandedNullIndex) {
			// expand left until we hit a non-null value
			currentIndex = nullIndex - 1;
			while (currentIndex >= 0 && seriesValues[currentIndex] == null) {
				seriesValues[currentIndex--] = null;
			}

			// expand right until we hit a non-null value
			currentIndex = nullIndex + 1;
			while (currentIndex < alignedLength && seriesValues[currentIndex] == null) {
				seriesValues[(lastExpandedNullIndex = currentIndex++)] = null;
			}
		}
	}
}

/**
 * Merges multiple uPlot `AlignedData` tables into a single aligned table.
 *
 * - Merges and sorts all distinct x-values from each table.
 * - Re-aligns every series onto the merged x-axis.
 * - Applies per-series null handling (`NULL_REMOVE`, `NULL_RETAIN`, `NULL_EXPAND`).
 */
/* eslint-disable sonarjs/cognitive-complexity */
export function mergeAlignedDataTables(
	alignedTables: AlignedData[],
	nullModes?: number[][],
): AlignedData {
	let mergedXValues: Set<number>;

	// eslint-disable-next-line prefer-const
	mergedXValues = new Set();

	// Collect all unique x-values from every table.
	for (let tableIndex = 0; tableIndex < alignedTables.length; tableIndex++) {
		const table = alignedTables[tableIndex];
		const xValues = table[0];
		const xLength = xValues.length;

		for (let i = 0; i < xLength; i++) {
			mergedXValues.add(xValues[i]);
		}
	}

	// Sorted, merged x-axis used by the final result.
	const alignedData: (number | null | undefined)[][] = [
		Array.from(mergedXValues).sort((a, b) => a - b),
	];

	const alignedLength = alignedData[0].length;

	// Map from x-value to its index in the merged x-axis.
	const xValueToIndexMap = new Map<number, number>();

	for (let i = 0; i < alignedLength; i++) {
		xValueToIndexMap.set(alignedData[0][i] as number, i);
	}

	// Re-align all series from all tables onto the merged x-axis.
	for (let tableIndex = 0; tableIndex < alignedTables.length; tableIndex++) {
		const table = alignedTables[tableIndex];
		const xValues = table[0];

		for (let seriesIndex = 1; seriesIndex < table.length; seriesIndex++) {
			const seriesValues = table[seriesIndex];

			const alignedSeriesValues = Array(alignedLength).fill(undefined);

			const nullHandlingMode = nullModes
				? nullModes[tableIndex][seriesIndex]
				: NULL_RETAIN;

			const nullIndices: number[] = [];

			for (let i = 0; i < seriesValues.length; i++) {
				const valueAtPoint = seriesValues[i];
				const alignedIndex = xValueToIndexMap.get(xValues[i]);

				if (alignedIndex == null) {
					continue;
				}

				if (valueAtPoint === null) {
					if (nullHandlingMode !== NULL_REMOVE) {
						alignedSeriesValues[alignedIndex] = valueAtPoint;

						if (nullHandlingMode === NULL_EXPAND) {
							nullIndices.push(alignedIndex);
						}
					}
				} else {
					alignedSeriesValues[alignedIndex] = valueAtPoint;
				}
			}

			// Optionally expand nulls to visually preserve gaps.
			propagateNullsAcrossNeighbors(
				alignedSeriesValues,
				nullIndices,
				alignedLength,
			);

			alignedData.push(alignedSeriesValues);
		}
	}

	return alignedData as AlignedData;
}

/**
 * Builds histogram buckets from raw values.
 *
 * - Each value is mapped into a bucket via `getBucketForValue`.
 * - Counts how many values fall into each bucket.
 * - Optionally sorts buckets using the provided comparator.
 */
export function buildHistogramBuckets(
	values: number[],
	getBucketForValue: (value: number) => number,
	sortBuckets?: ((a: number, b: number) => number) | null,
): AlignedData {
	const bucketMap = new Map<number, { value: number; count: number }>();

	for (let i = 0; i < values.length; i++) {
		let value = values[i];

		if (value != null) {
			value = getBucketForValue(value);
		}

		const bucket = bucketMap.get(value);

		if (bucket) {
			bucket.count++;
		} else {
			bucketMap.set(value, { value, count: 1 });
		}
	}

	const buckets = [...bucketMap.values()];

	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	sortBuckets && buckets.sort((a, b) => sortBuckets(a.value, b.value));

	const bucketValues = Array(buckets.length);
	const bucketCounts = Array(buckets.length);

	for (let i = 0; i < buckets.length; i++) {
		bucketValues[i] = buckets[i].value;
		bucketCounts[i] = buckets[i].count;
	}

	return [bucketValues, bucketCounts];
}

/**
 * Mutates an `AlignedData` instance, replacing all `undefined` entries
 * with explicit `null` values so uPlot treats them as gaps.
 */
export function replaceUndefinedWithNullInAlignedData(
	data: AlignedData,
): AlignedData {
	const seriesList = data as (number | null | undefined)[][];
	for (let seriesIndex = 0; seriesIndex < seriesList.length; seriesIndex++) {
		for (
			let pointIndex = 0;
			pointIndex < seriesList[seriesIndex].length;
			pointIndex++
		) {
			if (seriesList[seriesIndex][pointIndex] === undefined) {
				seriesList[seriesIndex][pointIndex] = null;
			}
		}
	}
	return data;
}

/**
 * Ensures the first histogram series has a leading "empty" bin so that
 * all series line up visually when rendered as bars.
 *
 * - Prepends a new x-value (first x - `bucketSize`) to the first series.
 * - Prepends `null` to all subsequent series at the same index.
 */
export function prependNullBinToFirstHistogramSeries(
	alignedData: AlignedData,
	bucketSize: number,
): void {
	const seriesList = alignedData as (number | null)[][];
	if (
		seriesList.length > 0 &&
		seriesList[0].length > 0 &&
		seriesList[0][0] !== null
	) {
		seriesList[0].unshift(seriesList[0][0] - bucketSize);
		for (let seriesIndex = 1; seriesIndex < seriesList.length; seriesIndex++) {
			seriesList[seriesIndex].unshift(null);
		}
	}
}
