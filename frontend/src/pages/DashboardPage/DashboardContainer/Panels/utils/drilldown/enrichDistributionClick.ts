import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { DistributionBarClick } from 'lib/visualization/charts/Distribution/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { getGroupByFilters } from './getGroupByFilters';
import { resolveDrilldownSignal } from './signal';

interface EnrichDistributionClickArgs {
	click: DistributionBarClick;
	queryName: string;
	builderQueries: BuilderQuery[];
	/** The fetched window: a bar sums the whole range, not one step. */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Turns a bar click into a drilldown payload, filtered to the clicked group. `null`
 * when the bar has no drillable query.
 */
export function enrichDistributionClick({
	click,
	queryName,
	builderQueries,
	timeRange,
}: EnrichDistributionClickArgs): DrilldownClickPayload | null {
	if (!isValidQueryName(queryName)) {
		return null;
	}
	const builderQuery = builderQueries.find((query) => query.name === queryName);

	return {
		coordinates: click.coordinates,
		context: {
			queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters: builderQuery
				? getGroupByFilters(click.series.groupLabels ?? {}, builderQuery)
				: [],
			timeRange,
			label: click.series.label,
			seriesColor: click.color,
		},
	};
}
