import type { PieSlice } from 'container/DashboardContainer/visualization/charts/types';
import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { getGroupByFilters } from './getGroupByFilters';
import { resolveDrilldownSignal } from './signal';

interface EnrichPieClickArgs {
	slice: PieSlice;
	builderQueries: BuilderQuery[];
	coordinates: { x: number; y: number };
	/** Explorer time window — the panel's fetched window (pie slices have no clicked bucket). */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Turns a pie-slice click into a drilldown payload, using the slice's source-row group-by label
 * values (carried by `preparePieData`) as equality filters. Returns `null` when the slice has no
 * drillable query.
 */
export function enrichPieClick({
	slice,
	builderQueries,
	coordinates,
	timeRange,
}: EnrichPieClickArgs): DrilldownClickPayload | null {
	const queryName = slice.queryName ?? '';
	if (!isValidQueryName(queryName)) {
		return null;
	}

	const builderQuery = builderQueries.find((query) => query.name === queryName);

	const filters = builderQuery
		? getGroupByFilters(slice.labels ?? {}, builderQuery)
		: [];
	return {
		coordinates,
		context: {
			queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters: filters,
			timeRange,
			label: slice.label,
			seriesColor: slice.color,
		},
	};
}
