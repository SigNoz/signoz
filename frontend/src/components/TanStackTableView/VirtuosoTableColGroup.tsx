import type { Table } from '@tanstack/react-table';

import type { TableColumnDef, TanStackTableProps } from './types';
import { getColumnMinWidthPx } from './utils';

import viewStyles from './TanStackTableView.module.scss';

export function VirtuosoTableColGroup<TData>({
	columns,
	columnSizingProp,
	table,
}: {
	columns: TableColumnDef<TData>[];
	columnSizingProp: TanStackTableProps<TData>['columnSizing'];
	table: Table<TData>;
}): JSX.Element {
	return (
		<colgroup>
			{columns.map((column, colIndex) => {
				const columnId = column.id;
				const isFixedColumn = column.width?.fixed != null;
				const minWidthPx = getColumnMinWidthPx(column);
				const persistedWidth = columnSizingProp?.[columnId];
				const computedWidth = table.getColumn(columnId)?.getSize();
				const effectiveWidth = persistedWidth ?? computedWidth;
				if (isFixedColumn) {
					return <col key={columnId} className={viewStyles.tanstackFixedCol} />;
				}
				const isLastColumn = colIndex === columns.length - 1;
				if (isLastColumn) {
					return (
						<col
							key={columnId}
							style={{ width: '100%', minWidth: `${minWidthPx}px` }}
						/>
					);
				}
				const widthPx =
					effectiveWidth != null ? Math.max(effectiveWidth, minWidthPx) : minWidthPx;
				return (
					<col
						key={columnId}
						style={{
							width: `${widthPx}px`,
							minWidth: `${minWidthPx}px`,
						}}
					/>
				);
			})}
		</colgroup>
	);
}
