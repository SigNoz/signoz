import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

/**
 * Reduces the scalar tables of a V5 response to the single number a
 * NumberPanel renders.
 *
 * V2 always issues `requestType: 'scalar'` for VALUE panels, so the response
 * is a scalar table per query (see `prepareScalarTables`). The value is the
 * first row's `isValueColumn` cell of the first table that has rows —
 * falling back to the row's first cell when no column is marked as the
 * value (mirrors the V1 `formatForWeb` fallback read).
 *
 * Returns `null` when there is no numeric value to show, which the renderer
 * maps to the "No Data" state.
 */
export function prepareNumberData(tables: PanelTable[]): number | null {
	for (const table of tables) {
		if (table.rows.length === 0) {
			continue;
		}
		const row = table.rows[0].data;
		const valueColumn = table.columns.find((column) => column.isValueColumn);
		const raw = valueColumn
			? row[valueColumn.id || valueColumn.name]
			: Object.values(row)[0];
		const value = Number(raw);
		if (Number.isFinite(value)) {
			return value;
		}
	}

	return null;
}
