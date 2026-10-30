import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Value column id → `queryName.name`, so `count()` on two queries reads apart.
 * A name that already is the query name (a formula, a PromQL query) stays bare.
 */
export function getValueColumnLabels(
	columns: PanelTableColumn[],
): Record<string, string> {
	return Object.fromEntries(
		columns
			.filter((column) => column.isValueColumn)
			.map((column) => [
				column.id || column.name,
				column.queryName && column.name !== column.queryName
					? `${column.queryName}.${column.name}`
					: column.name,
			]),
	);
}
