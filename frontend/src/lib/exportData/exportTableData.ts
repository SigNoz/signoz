import { SerializedTable } from './types';
import { withUnit } from './withUnit';

/** Generic table-model column — any prepared table (QueryTable, dashboard
 * tables, plain antd tables) adapts to this in a line or two. */
export interface ExportTableColumn {
	/** Display name, used as the export header (column order = array order). */
	name: string;
	/** Key into each dataSource record. */
	key: string;
	isValueColumn?: boolean;
}

interface ExportTableDataArgs {
	columns: ExportTableColumn[];
	dataSource: Record<string, unknown>[];
	/** Per-column display unit, keyed by column key (dashboards; absent in explorer). */
	columnUnits?: Record<string, string>;
}

/**
 * Serializes a prepared table model into a format-agnostic table — raw values
 * in display column order (lossless; no cell formatting applied).
 */
export function exportTableData({
	columns,
	dataSource,
	columnUnits,
}: ExportTableDataArgs): SerializedTable {
	const headers = columns.map((column) =>
		column.isValueColumn
			? withUnit(column.name, columnUnits?.[column.key])
			: column.name,
	);

	const rows = dataSource.map((record) =>
		columns.map((column) => {
			const value = record[column.key];
			return value === undefined || value === null
				? ''
				: (value as string | number);
		}),
	);

	return { headers, rows };
}
