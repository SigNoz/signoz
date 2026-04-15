import type { Table } from '@tanstack/react-table';

import type { TableColumnDef } from './types';

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
			{visibleTanstackColumns.map((tanstackCol) => {
				const colDef = columnDefsById.get(tanstackCol.id);
				const isFixedColumn = colDef?.width?.fixed != null;
				const hasDefaultWidth = colDef?.width?.default != null;
				const hasMinMax = colDef?.width?.min != null && colDef?.width?.max != null;
				const hasPersistedWidth = columnSizing[tanstackCol.id] != null;

				const computedSize = tanstackCol.getSize();
				const minSize = tanstackCol.columnDef.minSize;
				const maxSize = tanstackCol.columnDef.maxSize;

				if (isFixedColumn) {
					return (
						<col
							key={tanstackCol.id}
							style={{
								width: computedSize,
								minWidth: computedSize,
								maxWidth: computedSize,
							}}
						/>
					);
				}

				if (hasMinMax && !hasDefaultWidth && !hasPersistedWidth) {
					return (
						<col
							key={tanstackCol.id}
							style={{
								minWidth: minSize,
								maxWidth: maxSize,
							}}
						/>
					);
				}

				return (
					<col
						key={tanstackCol.id}
						style={{
							width: computedSize,
							minWidth: minSize,
							maxWidth: maxSize,
						}}
					/>
				);
			})}
		</colgroup>
	);
}
