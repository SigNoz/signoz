type MeanInput = number | null | undefined;

function finiteMean(values: Iterable<MeanInput>): number | null {
	let sum = 0;
	let count = 0;
	for (const value of values) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			sum += value;
			count += 1;
		}
	}
	return count > 0 ? sum / count : null;
}

export interface SortByMeanDescOptions<T> {
	/** Numeric values of an item; non-finite entries are ignored. */
	getValues: (item: T) => Iterable<MeanInput>;
	/** Stable identity of an item, used to break ties on equal means. */
	getKey: (item: T) => string;
}

/**
 * Orders series by descending mean, on a copy (V1 parity: `utils/getSortedSeriesData`). The wire
 * order can't stand in for it: the backend returns series in Go map-iteration order.
 *
 * Call this before building the uPlot config and aligned data — those two and click attribution
 * all index the list positionally, and uPlot draws a stacked bar's segments in series-index order.
 */
export function sortByMeanDesc<T>(
	items: T[],
	{ getValues, getKey }: SortByMeanDescOptions<T>,
): T[] {
	return items
		.map((item) => ({ item, mean: finiteMean(getValues(item)) }))
		.sort((a, b) => {
			if (a.mean !== null && b.mean !== null && a.mean !== b.mean) {
				return b.mean - a.mean;
			}
			if ((a.mean === null) !== (b.mean === null)) {
				return a.mean === null ? 1 : -1;
			}
			return getKey(a.item).localeCompare(getKey(b.item));
		})
		.map(({ item }) => item);
}
