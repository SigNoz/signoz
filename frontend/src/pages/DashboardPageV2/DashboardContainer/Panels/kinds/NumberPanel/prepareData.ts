import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

/**
 * Reduces the scalar tables of a V5 response to the single number a NumberPanel
 * renders: the first row's `isValueColumn` cell of the first table with rows,
 * falling back to the row's first cell (mirrors the V1 `formatForWeb` read).
 * Returns `null` when there is no numeric value (renderer shows "No Data").
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
