import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { resolveDrilldownSignal } from './signal';

interface EnrichNumberClickArgs {
	/** The panel's scalar tables — the displayed value's column selects the drilldown query. */
	tables: PanelTable[];
	/** The panel's builder queries; resolves the clicked query's signal by name. */
	builderQueries: BuilderQuery[];
	coordinates: { x: number; y: number };
	/** Explorer time window — the panel's fetched window (the value has no clicked bucket). */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Turns a Number/Value click into a drilldown payload. Drills into the query the panel actually
 * displays — the first table-with-rows' value column (mirrors `prepareNumberData`), not blindly
 * `builderQueries[0]` (they diverge for multi-query panels). Returns `null` when that query isn't
 * drillable (promql/formula).
 */
export function enrichNumberClick({
	tables,
	builderQueries,
	coordinates,
	timeRange,
}: EnrichNumberClickArgs): DrilldownClickPayload | null {
	const valueColumn = tables
		.find((table) => table.rows.length > 0)
		?.columns.find((column) => column.isValueColumn);
	const queryName = valueColumn?.queryName ?? builderQueries[0]?.name ?? '';
	if (!isValidQueryName(queryName)) {
		return null;
	}

	const builderQuery = builderQueries.find((query) => query.name === queryName);
	return {
		coordinates,
		context: {
			queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters: [],
			timeRange,
		},
	};
}
