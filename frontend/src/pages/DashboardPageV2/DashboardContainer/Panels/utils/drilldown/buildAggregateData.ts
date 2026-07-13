import type { AggregateData } from 'container/QueryTable/Drilldown/useAggregateDrilldown';

import type { DrilldownContext } from '../../types/drilldown';

/**
 * Adapts a V2 `DrilldownContext` to the V1 `AggregateData` that `buildDrilldownUrl`/the drilldown
 * navigate hook consume. The single boundary between the V2 click payload and the reused V1
 * navigation machinery.
 */
export function buildAggregateData(context: DrilldownContext): AggregateData {
	return {
		queryName: context.queryName,
		filters: context.filters,
		timeRange: context.timeRange,
		label: context.label,
		seriesColor: context.seriesColor,
	};
}
