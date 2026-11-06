import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Value column id → its name, prefixed `queryName.name` only when another value column
 * shares the name, so `count()` on two queries reads apart while a lone value keeps the
 * name its alias or legend gave it.
 */
export function getValueColumnLabels(
	columns: PanelTableColumn[],
): Record<string, string> {
	const valueColumns = columns.filter((column) => column.isValueColumn);
	const nameCounts = new Map<string, number>();
	valueColumns.forEach((column) =>
		nameCounts.set(column.name, (nameCounts.get(column.name) ?? 0) + 1),
	);

	return Object.fromEntries(
		valueColumns.map((column) => [
			column.id || column.name,
			column.queryName &&
			column.name !== column.queryName &&
			(nameCounts.get(column.name) ?? 0) > 1
				? `${column.queryName}.${column.name}`
				: column.name,
		]),
	);
}
