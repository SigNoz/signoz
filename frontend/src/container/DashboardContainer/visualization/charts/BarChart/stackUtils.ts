import uPlot, { AlignedData } from 'uplot';

/**
 * Stack data cumulatively (top-down: first series = top, last = bottom).
 * When omit(i) returns true for a series index, that series is excluded from stacking.
 */
export function stack(
	data: AlignedData,
	omit: (seriesIndex: number) => boolean,
): { data: AlignedData; bands: uPlot.Band[] } {
	const d0Len = data[0].length;
	const n = data.length - 1;
	const data2: (number | null)[][] = Array(n);
	const accum = Array(d0Len).fill(0) as number[];

	// Accumulate from last series upward: last = raw, first = total
	for (let i = n; i >= 1; i--) {
		const seriesData = data[i] as (number | null)[];
		if (omit(i)) {
			data2[i - 1] = seriesData;
		} else {
			data2[i - 1] = seriesData.map((v, idx) => {
				const val = v == null ? 0 : Number(v);
				return (accum[idx] += val);
			});
		}
	}

	const bands: uPlot.Band[] = [];
	// Bands: [upper, lower] - fill between consecutive visible series
	for (let i = 1; i < data.length; i++) {
		if (!omit(i)) {
			const nextIdx = data.findIndex((_, j) => j > i && !omit(j));
			if (nextIdx >= 1) {
				bands.push({ series: [i, nextIdx] });
			}
		}
	}

	return {
		data: [data[0], ...data2] as AlignedData,
		bands,
	};
}

/**
 * Returns band indices for initial stacked state (no series omitted).
 * Top-down: first series at top, band fills between consecutive series.
 * uPlot band format: [upperSeriesIdx, lowerSeriesIdx].
 */
export function getInitialStackedBands(seriesCount: number): uPlot.Band[] {
	const bands: uPlot.Band[] = [];
	for (let i = 1; i < seriesCount; i++) {
		bands.push({ series: [i, i + 1] });
	}
	return bands;
}
