import { LegendItem } from 'lib/uPlotV2/config/types';

export interface ShownSeriesState {
	visibleCount: number;
	/** The series index when exactly one series is shown, else null. */
	soleShownSeriesIndex: number | null;
}

/**
 * Driven by what is actually shown, never a remembered isolation: hiding series
 * one at a time down to a single one is the same state as "Only".
 */
export function getShownSeriesState(items: LegendItem[]): ShownSeriesState {
	const shown = items.filter((item) => item.show);

	return {
		visibleCount: shown.length,
		soleShownSeriesIndex: shown.length === 1 ? shown[0].seriesIndex : null,
	};
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
