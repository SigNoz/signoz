import type { Table } from '@tanstack/react-table';

import type { TableColumnDef } from './types';
import { getColumnWidthStyle } from './utils';

export function VirtuosoTableColGroup<TData>({
	columns,
	table,
}: {
	columns: TableColumnDef<TData>[];
	table: Table<TData>;
}): JSX.Element {
	const visibleTanstackColumns = table.getVisibleFlatColumns();
	const columnDefsById = new Map(columns.map((c) => [c.id, c]));
	const columnSizing = table.getState().columnSizing;

	return (
		<colgroup>
			{visibleTanstackColumns.map((tanstackCol, index) => {
				const colDef = columnDefsById.get(tanstackCol.id);
				if (!colDef) {
					return <col key={tanstackCol.id} />;
				}
				const persistedWidth = columnSizing[tanstackCol.id];
				const isLastColumn = index === visibleTanstackColumns.length - 1;
				return (
					<col
						key={tanstackCol.id}
						style={getColumnWidthStyle(colDef, persistedWidth, isLastColumn)}
					/>
				);
			})}
		</colgroup>
	);
}
