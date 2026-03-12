import { AlignedData } from 'uplot';

/**
 * Convert short runs of nulls between two defined points into undefined so that
 * uPlot treats them as "no point" but keeps the line continuous for gaps
 * smaller than the provided time threshold.
 */

type AlignedXValues = AlignedData[0];
type YValues = Array<number | null | undefined>;

interface GapArgs {
	xValues: AlignedXValues;
	yValues: YValues;
	maxGapThreshold: number;
	startIndex: number;
	endIndex: number;
}

function spanShortGap(args: GapArgs): void {
	const { xValues, yValues, maxGapThreshold, startIndex, endIndex } = args;

	const gapSize = xValues[endIndex] - xValues[startIndex];
	if (gapSize >= maxGapThreshold) {
		return;
	}

	for (let index = startIndex + 1; index < endIndex; index += 1) {
		if (yValues[index] === null || yValues[index] === undefined) {
			// Use undefined to indicate "no sample" so the line can span
			yValues[index] = undefined;
		}
	}
}

export function nullToUndefThreshold(
	xValues: AlignedXValues,
	yValues: YValues,
	maxGapThreshold: number,
): YValues {
	if (!Array.isArray(xValues) || !Array.isArray(yValues)) {
		return yValues;
	}

	const length = Math.min(xValues.length, yValues.length);
	if (length === 0 || maxGapThreshold <= 0) {
		return yValues;
	}

	let previousDefinedIndex: number | null = null;

	for (let index = 0; index < length; index += 1) {
		const value = yValues[index];

		if (value === null || value === undefined) {
			continue;
		}

		if (previousDefinedIndex !== null && index - previousDefinedIndex > 1) {
			spanShortGap({
				xValues,
				yValues,
				maxGapThreshold,
				startIndex: previousDefinedIndex,
				endIndex: index,
			});
		}

		previousDefinedIndex = index;
	}

	return yValues;
}
