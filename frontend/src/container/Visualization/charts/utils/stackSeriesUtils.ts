import uPlot, { AlignedData } from 'uplot';

/**
 * Stack data cumulatively (top-down: first series = top, last = bottom).
 * When `omit(seriesIndex)` returns true, that series is excluded from stacking.
 */
export function stackSeries(
	data: AlignedData,
	omit: (seriesIndex: number) => boolean,
): { data: AlignedData; bands: uPlot.Band[] } {
	const timeAxis = data[0];
	const pointCount = timeAxis.length;
	const valueSeriesCount = data.length - 1; // exclude time axis

	const stackedSeries = buildStackedSeries({
		data,
		valueSeriesCount,
		pointCount,
		omit,
	});
	const bands = buildFillBands(valueSeriesCount + 1, omit); // +1 for 1-based series indices

	return {
		data: [timeAxis, ...stackedSeries] as AlignedData,
		bands,
	};
}

interface BuildStackedSeriesParams {
	data: AlignedData;
	valueSeriesCount: number;
	pointCount: number;
	omit: (seriesIndex: number) => boolean;
}

/**
 * Accumulate from last series upward: last series = raw values, first = total.
 * Omitted series are copied as-is (no accumulation).
 */
function buildStackedSeries({
	data,
	valueSeriesCount,
	pointCount,
	omit,
}: BuildStackedSeriesParams): (number | null)[][] {
	const stackedSeries: (number | null)[][] = Array(valueSeriesCount);
	const cumulativeSums = Array(pointCount).fill(0) as number[];

	for (let seriesIndex = valueSeriesCount; seriesIndex >= 1; seriesIndex--) {
		const rawValues = data[seriesIndex] as (number | null)[];

		if (omit(seriesIndex)) {
			stackedSeries[seriesIndex - 1] = rawValues;
		} else {
			stackedSeries[seriesIndex - 1] = rawValues.map((rawValue, pointIndex) => {
				const numericValue = rawValue == null ? 0 : Number(rawValue);
				return (cumulativeSums[pointIndex] += numericValue);
			});
		}
	}

	return stackedSeries;
}

/**
 * Bands define fill between consecutive visible series for stacked appearance.
 * uPlot format: [upperSeriesIdx, lowerSeriesIdx].
 */
function buildFillBands(
	seriesLength: number,
	omit: (seriesIndex: number) => boolean,
): uPlot.Band[] {
	const bands: uPlot.Band[] = [];

	for (let seriesIndex = 1; seriesIndex < seriesLength; seriesIndex++) {
		if (omit(seriesIndex)) {
			continue;
		}
		const nextVisibleSeriesIndex = findNextVisibleSeriesIndex(
			seriesLength,
			seriesIndex,
			omit,
		);
		if (nextVisibleSeriesIndex !== -1) {
			bands.push({ series: [seriesIndex, nextVisibleSeriesIndex] });
		}
	}

	return bands;
}

function findNextVisibleSeriesIndex(
	seriesLength: number,
	afterIndex: number,
	omit: (seriesIndex: number) => boolean,
): number {
	for (let i = afterIndex + 1; i < seriesLength; i++) {
		if (!omit(i)) {
			return i;
		}
	}
	return -1;
}

/**
 * Returns band indices for initial stacked state (no series omitted).
 * Top-down: first series at top, band fills between consecutive series.
 * uPlot band format: [upperSeriesIdx, lowerSeriesIdx].
 */
export function getInitialStackedBands(seriesCount: number): uPlot.Band[] {
	const bands: uPlot.Band[] = [];
	for (let seriesIndex = 1; seriesIndex < seriesCount; seriesIndex++) {
		bands.push({ series: [seriesIndex, seriesIndex + 1] });
	}
	return bands;
}
