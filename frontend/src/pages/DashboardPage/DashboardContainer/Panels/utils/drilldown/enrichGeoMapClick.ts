import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { getGroupByFilters } from './getGroupByFilters';
import { resolveDrilldownSignal } from './signal';

interface EnrichGeoMapClickArgs {
	/** Group-by key → the clicked row's value, as the query returned it. */
	labels: Record<string, string>;
	/** The location's name: a country or state as returned, or a point's label. */
	label: string;
	/** Color column's query first, then size's: a formula is not a builder query. */
	queryNames: string[];
	builderQueries: BuilderQuery[];
	coordinates: { x: number; y: number };
	/** The panel's fetched window; a location summarises all of it. */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Drilldown filtered to the clicked location's row. A formula's inputs share its
 * group by, so with neither column from a builder query the first one stands in.
 */
export function enrichGeoMapClick({
	labels,
	label,
	queryNames,
	builderQueries,
	coordinates,
	timeRange,
}: EnrichGeoMapClickArgs): DrilldownClickPayload | null {
	const builderQuery =
		queryNames
			.filter(isValidQueryName)
			.map((name) => builderQueries.find((query) => query.name === name))
			.find(Boolean) ?? builderQueries[0];
	if (!builderQuery?.name) {
		return null;
	}
	return {
		coordinates,
		context: {
			queryName: builderQuery.name,
			signal: resolveDrilldownSignal(builderQuery),
			filters: getGroupByFilters(labels, builderQuery),
			timeRange,
			label,
		},
	};
}
