import { OPERATORS } from 'constants/queryBuilder';
import {
	type FilterData,
	isValidQueryName,
} from 'container/QueryTable/Drilldown/drilldownUtils';
import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { resolveDrilldownSignal } from './signal';

interface EnrichTableClickArgs {
	/** The clicked row's data, keyed by column id (see `prepareScalarTables`). */
	record: Record<string, unknown>;
	/** The clicked column's key (`column.id || column.name`). */
	columnId: string;
	table: PanelTable;
	builderQueries: BuilderQuery[];
	coordinates: { x: number; y: number };
	/** Explorer time window — the panel's fetched window (scalar tables have no clicked bucket). */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Turns a table cell click into a drilldown payload. The clicked value column (or the row's first
 * value column) selects the aggregate query, and the row's group-by cells become equality filters
 * (V1 `getFiltersToAddToView` parity). `columnKind` records whether a value or group column was
 * clicked, for the future filter-by-value menu. Returns `null` when the row has no drillable
 * aggregate query.
 */
export function enrichTableClick({
	record,
	columnId,
	table,
	builderQueries,
	coordinates,
	timeRange,
}: EnrichTableClickArgs): DrilldownClickPayload | null {
	const clickedColumn = table.columns.find(
		(col) => (col.id || col.name) === columnId,
	);
	const valueColumn = clickedColumn?.isValueColumn
		? clickedColumn
		: table.columns.find((col) => col.isValueColumn);
	if (!valueColumn || !isValidQueryName(valueColumn.queryName)) {
		return null;
	}

	const filters = table.columns.reduce<FilterData[]>((acc, col) => {
		if (col.isValueColumn) {
			return acc;
		}
		const value = record[col.id || col.name];
		if (value != null) {
			// Group cell value → equality filter. Cast at the boundary: row data is `unknown`,
			// group cells hold scalar label values.
			acc.push({
				filterKey: col.name,
				filterValue: value as string | number,
				operator: OPERATORS['='],
			});
		}
		return acc;
	}, []);

	const builderQuery = builderQueries.find(
		(query) => query.name === valueColumn.queryName,
	);

	// A group-column click filters by that single cell (V1 filter-by-value); a value-column click
	// opens the aggregate menu scoped by the whole row.
	const isGroupColumn = clickedColumn != null && !clickedColumn.isValueColumn;

	return {
		coordinates,
		context: {
			queryName: valueColumn.queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters,
			timeRange,
			// No `label`: like Number/Value, the aggregate menu header falls back to the
			// aggregation expression (e.g. `sum(signoz_calls_total)`), not the column name (V1 parity).
			columnKind: isGroupColumn ? 'group' : 'aggregate',
			clickedKey: isGroupColumn ? clickedColumn?.name : undefined,
			clickedValue: isGroupColumn
				? (record[columnId] as string | number)
				: undefined,
		},
	};
}
