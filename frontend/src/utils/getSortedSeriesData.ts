import { QueryData } from 'types/api/widgets/getQuery';

function computeSeriesMean(values?: [number, string][]): number | null {
	if (!values || values.length === 0) {
		return null;
	}

	let sum = 0;
	let count = 0;

	for (let i = 0; i < values.length; i += 1) {
		const raw = values[i]?.[1];
		if (raw !== undefined && raw !== null && raw !== '') {
			const num = typeof raw === 'number' ? raw : parseFloat(raw);
			if (Number.isFinite(num)) {
				sum += num;
				count += 1;
			}
		}
	}

	return count > 0 ? sum / count : null;
}

/**
 * Sorts series data in descending order of average values for cumulative bar chart plotting.
 * Returns a new sorted array copy without mutating the input.
 */
export const getSortedSeriesData = (
	result: QueryData[] | undefined,
): QueryData[] => {
	if (!result || result.length === 0) {
		return [];
	}

	if (result.length === 1) {
		return [result[0]];
	}

	// Precompute the mean for each series once to avoid O(M log M * N) redundant reductions and string parsing
	const itemsWithMean = result.map((series, originalIndex) => ({
		series,
		mean: computeSeriesMean(series?.values),
		originalIndex,
	}));

	itemsWithMean.sort((a, b) => {
		// Both have valid finite means
		if (a.mean !== null && b.mean !== null && a.mean !== b.mean) {
			return b.mean - a.mean;
		}

		// Series with null/empty values sink to the end
		if ((a.mean === null) !== (b.mean === null)) {
			return a.mean === null ? 1 : -1;
		}

		// Stable tie-breaker: preserve original index
		return a.originalIndex - b.originalIndex;
	});

	return itemsWithMean.map((item) => item.series);
};
