import {
	type DashboardtypesQueryDTO,
	DashboardtypesSeriesOrderDTO,
} from 'api/generated/services/sigNoz.schemas';
import { extractQueryNames } from 'pages/DashboardPage/DashboardContainer/queryV5/buildQueryRangeRequest';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { seriesKey } from './seriesKey';
import { sortSeriesByMeanDesc } from './sortSeriesByMean';

/**
 * Orders series by where their query sits in `queryNames`, on a copy. Unlike the mean sort this
 * reads the panel's own definition, so one spec draws the same order on every panel and every
 * refresh. Series from a query the panel no longer defines share the last rank.
 *
 * A grouped query fans out to one series per label set, all sharing a rank, so `seriesKey` settles
 * the order within a query.
 *
 * `stackSeries` accumulates from the last series upward: the first series here is the *top* segment
 * of a stacked bar, and the panel's last query sits on the axis.
 */
export function sortSeriesByDefinitionOrder(
	series: PanelSeries[],
	queryNames: string[],
): PanelSeries[] {
	const rankByQueryName = new Map(
		queryNames.map((name, index) => [name, index] as const),
	);
	return series
		.map((item) => ({
			item,
			rank: rankByQueryName.get(item.queryName) ?? queryNames.length,
			key: seriesKey(item),
		}))
		.sort((a, b) => {
			if (a.rank !== b.rank) {
				return a.rank - b.rank;
			}
			if (a.item.queryName !== b.item.queryName) {
				return a.item.queryName.localeCompare(b.item.queryName);
			}
			// Numeric, so a query with more than ten aggregations keeps them in
			// definition order rather than "1, 10, 2".
			const byIndex = a.item.aggregation.index - b.item.aggregation.index;
			return byIndex !== 0 ? byIndex : a.key.localeCompare(b.key);
		})
		.map(({ item }) => item);
}

interface SortPanelSeriesArgs {
	series: PanelSeries[];
	/** `spec.legend.seriesOrder`; missing falls back to `mean_desc`, the schema default. */
	seriesOrder: DashboardtypesSeriesOrderDTO | undefined;
	queries: DashboardtypesQueryDTO[];
}

/**
 * Applies the panel's configured series order. Call it before building the config and chart data —
 * those two and click attribution all index the series list positionally.
 */
export function sortPanelSeries({
	series,
	seriesOrder,
	queries,
}: SortPanelSeriesArgs): PanelSeries[] {
	if (seriesOrder === DashboardtypesSeriesOrderDTO.definition) {
		return sortSeriesByDefinitionOrder(series, extractQueryNames(queries));
	}
	return sortSeriesByMeanDesc(series);
}
