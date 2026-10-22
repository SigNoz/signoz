import { LegendItem } from 'lib/uPlotV2/config/types';

export interface LegendViewState {
	listedItems: LegendItem[];
	/** Listed items that are toggled on, against every series in the readout. */
	visibleCount: number;
	/** The series index when exactly one series is toggled on, else null. */
	onlyVisibleSeriesIndex: number | null;
	areAllSeriesVisible: boolean;
}

export function filterLegendItems(
	items: LegendItem[],
	query: string,
): LegendItem[] {
	const normalisedQuery = query.trim().toLowerCase();
	if (!normalisedQuery) {
		return items;
	}

	return items.filter((item) =>
		item.label?.toLowerCase().includes(normalisedQuery),
	);
}

/**
 * Isolation is driven by what is actually shown, never a remembered one: hiding
 * series one at a time down to a single one is the same state as "Only". It is
 * read off the whole series set, not off what the search left listed.
 */
export function getVisibleSeriesState(
	items: LegendItem[],
	query: string,
): LegendViewState {
	const visible = items.filter((item) => item.show);
	const listedItems = filterLegendItems(items, query);

	return {
		listedItems,
		visibleCount: listedItems.filter((item) => item.show).length,
		onlyVisibleSeriesIndex: visible.length === 1 ? visible[0].seriesIndex : null,
		areAllSeriesVisible: visible.length === items.length,
	};
}
