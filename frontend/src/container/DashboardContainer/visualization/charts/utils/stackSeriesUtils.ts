import { StackMode } from 'lib/uPlotV2/config/types';
import uPlot, { AlignedData } from 'uplot';

/**
 * Stack data cumulatively (top-down: first series = top, last = bottom).
 * When `omit(seriesIndex)` returns true, that series keeps its raw values and
 * contributes nothing to the total. `None` is a no-op.
 */
export function stackSeries(
	data: AlignedData,
	omit: (seriesIndex: number) => boolean,
	mode: StackMode = StackMode.Normal,
): { data: AlignedData; bands: uPlot.Band[] } {
	if (mode === StackMode.None) {
		return { data, bands: [] };
	}

	const timeAxis = data[0];
	const pointCount = timeAxis.length;
	const valueSeriesCount = data.length - 1; // exclude time axis

	const stackedSeries = buildStackedSeries({
		data,
		valueSeriesCount,
		pointCount,
		omit,
		mode,
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
	mode: StackMode;
}

/** Per-point total. Mixed-sign columns sum signed, as "share of total" implies. */
function columnTotals({
	data,
	valueSeriesCount,
	pointCount,
	omit,
}: Omit<BuildStackedSeriesParams, 'mode'>): number[] {
	const totals = Array(pointCount).fill(0) as number[];

	for (let seriesIndex = 1; seriesIndex <= valueSeriesCount; seriesIndex++) {
		if (omit(seriesIndex)) {
			continue;
		}
		const rawValues = data[seriesIndex] as (number | null)[];
		rawValues.forEach((rawValue, pointIndex) => {
			totals[pointIndex] += rawValue == null ? 0 : Number(rawValue);
		});
	}

	return totals;
}

/** A column whose participating series sum to 0 has no share to divide, so every slice is 0. */
function toPercent(value: number, total: number): number {
	return total === 0 ? 0 : (value / total) * 100;
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
	mode,
}: BuildStackedSeriesParams): (number | null)[][] {
	const stackedSeries: (number | null)[][] = Array(valueSeriesCount);
	const cumulativeSums = Array(pointCount).fill(0) as number[];
	// Known up front: totals span series the accumulation below has not reached yet.
	const totals =
		mode === StackMode.Percent
			? columnTotals({ data, valueSeriesCount, pointCount, omit })
			: undefined;

	for (let seriesIndex = valueSeriesCount; seriesIndex >= 1; seriesIndex--) {
		const rawValues = data[seriesIndex] as (number | null)[];

		if (omit(seriesIndex)) {
			stackedSeries[seriesIndex - 1] = rawValues;
		} else {
			stackedSeries[seriesIndex - 1] = rawValues.map((rawValue, pointIndex) => {
				const numericValue = rawValue == null ? 0 : Number(rawValue);
				const contribution = totals
					? toPercent(numericValue, totals[pointIndex])
					: numericValue;
				return (cumulativeSums[pointIndex] += contribution);
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
