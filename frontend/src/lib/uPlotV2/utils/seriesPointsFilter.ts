import uPlot from 'uplot';

/**
 * Scans outward from approxIdx to find the nearest non-null data index.
 * posToIdx can land on a null when pixel density exceeds 1 point-per-pixel.
 */
export function findNearestNonNull(
	yData: (number | null | undefined)[],
	approxIdx: number,
): number {
	for (let j = 1; j < 100; j++) {
		if (yData[approxIdx + j] != null) {
			return approxIdx + j;
		}
		if (yData[approxIdx - j] != null) {
			return approxIdx - j;
		}
	}
	return approxIdx;
}

/**
 * Returns data indices of points sandwiched between two consecutive gaps that
 * share a pixel boundary — meaning a point (or cluster) is isolated between them.
 */
export function findSandwichedIndices(
	gaps: number[][],
	yData: (number | null | undefined)[],
	uPlotInstance: uPlot,
): number[] {
	const indices: number[] = [];
	for (let i = 0; i < gaps.length; i++) {
		const nextGap = gaps[i + 1];
		if (nextGap && gaps[i][1] === nextGap[0]) {
			const approxIdx = uPlotInstance.posToIdx(gaps[i][1], true);
			indices.push(
				yData[approxIdx] == null ? findNearestNonNull(yData, approxIdx) : approxIdx,
			);
		}
	}
	return indices;
}

/**
 * Points filter that shows data points isolated by gap-nulls (no connecting line).
 * Used when spanGaps threshold mode injects nulls around gaps — without this,
 * lone points become invisible because no line connects to them.
 *
 * Uses uPlot's gap pixel array rather than checking raw null neighbors in the
 * data array. Returns an array of data indices (not a bitmask); null = no points.
 *

 */
// eslint-disable-next-line max-params
export function isolatedPointFilter(
	uPlotInstance: uPlot,
	seriesIdx: number,
	show: boolean,
	gaps?: null | number[][],
): number[] | null {
	if (show || !gaps || gaps.length === 0) {
		return null;
	}

	const idxs = uPlotInstance.series[seriesIdx].idxs;
	if (!idxs) {
		return null;
	}

	const [firstIdx, lastIdx] = idxs;
	const xData = uPlotInstance.data[0] as number[];
	const yData = uPlotInstance.data[seriesIdx] as (number | null | undefined)[];

	// valToPos with canvas=true matches the pixel space used by the gaps array.
	const firstPos = Math.round(
		uPlotInstance.valToPos(xData[firstIdx], 'x', true),
	);
	const lastPos = Math.round(uPlotInstance.valToPos(xData[lastIdx], 'x', true));

	const filtered: number[] = [];

	if (gaps[0][0] === firstPos) {
		filtered.push(firstIdx);
	}

	filtered.push(...findSandwichedIndices(gaps, yData, uPlotInstance));

	if (gaps[gaps.length - 1][1] === lastPos) {
		filtered.push(lastIdx);
	}

	return filtered.length ? filtered : null;
}
