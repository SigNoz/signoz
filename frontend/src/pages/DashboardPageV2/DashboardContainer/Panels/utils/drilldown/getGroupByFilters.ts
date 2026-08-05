import {
	type FilterData,
	getFiltersFromMetric,
} from 'container/QueryTable/Drilldown/drilldownUtils';
import type { BuilderQuery } from 'types/api/v5/queryRange';

/**
 * Equality filters for the clicked series/slice, restricted to the query's group-by dimensions.
 * `labels` also carry a display-only legend backfill (`{queryName: queryName}` when ungrouped, see
 * `resolveLegendAndLabels`); intersecting with group-by drops it so `filters` stays empty when
 * ungrouped, matching V1.
 */
export function getGroupByFilters(
	labels: Record<string, string>,
	builderQuery: BuilderQuery,
): FilterData[] {
	const groupByKeys = new Set(
		(builderQuery.groupBy ?? []).map((group) => group.name),
	);
	if (groupByKeys.size === 0) {
		return [];
	}
	return getFiltersFromMetric(labels).filter((filter) =>
		groupByKeys.has(filter.filterKey),
	);
}
