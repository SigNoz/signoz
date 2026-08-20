import { HeatmapGrid, HeatmapSeries } from './types';

const EMPTY_GRID: HeatmapGrid = {
	bounds: [],
	timestamps: [],
	step: 0,
	counts: [],
};

/**
 * Highest single-cell count each group reaches. Read against the same domain the
 * colour bar uses, this is where a group sits on that bar.
 */
export function resolveGroupPeaks(
	series: HeatmapSeries[],
): Map<string, number> {
	const peaks = new Map<string, number>();
	series.forEach((entry) => {
		let peak = 0;
		entry.points.forEach((point) =>
			point.counts.forEach((count) => {
				if (count !== null && count > peak) {
					peak = count;
				}
			}),
		);
		peaks.set(entry.label, peak);
	});
	return peaks;
}

/** Groups the legend currently has enabled. `undefined` means all of them. */
function resolveVisible(
	series: HeatmapSeries[],
	visibleGroups: string[] | undefined,
): HeatmapSeries[] {
	if (visibleGroups === undefined) {
		return series;
	}
	const allowed = new Set(visibleGroups);
	return series.filter((entry) => allowed.has(entry.label));
}

/**
 * Pivots the response's column-major counts into the row-major grid the renderer
 * draws, and sums the enabled groups — counts are additive, so the sum is exact and
 * needs no extra request. A cell is `null` only when no group contributed to it.
 */
export function resolveHeatmapGrid({
	buckets,
	step,
	series,
	visibleGroups,
}: {
	buckets: number[];
	/** Column width in seconds. */
	step: number;
	series: HeatmapSeries[];
	/** Labels the legend has enabled. `undefined` sums every group. */
	visibleGroups?: string[];
}): HeatmapGrid {
	if (buckets.length === 0 || series.length === 0) {
		return EMPTY_GRID;
	}

	const selected = resolveVisible(series, visibleGroups);

	// Groups are not guaranteed to share timestamps, so the columns are their union.
	const timestampSet = new Set<number>();
	selected.forEach((entry) => {
		entry.points.forEach((point) => timestampSet.add(point.timestamp));
	});
	const timestamps = Array.from(timestampSet).sort((a, b) => a - b);
	const columnOf = new Map(timestamps.map((value, index) => [value, index]));

	// N boundaries describe N+1 rows: the underflow row and the `+Inf` overflow row.
	const rowCount = buckets.length + 1;
	const counts: Array<Array<number | null>> = Array.from(
		{ length: rowCount },
		() => new Array<number | null>(timestamps.length).fill(null),
	);

	selected.forEach((entry) => {
		entry.points.forEach((point) => {
			const column = columnOf.get(point.timestamp);
			if (column === undefined) {
				return;
			}
			point.counts.forEach((count, row) => {
				if (row >= rowCount || count === null || count === undefined) {
					return;
				}
				counts[row][column] = (counts[row][column] ?? 0) + count;
			});
		});
	});

	return { bounds: buckets, timestamps, step, counts };
}
