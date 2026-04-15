import { useMemo } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';
import { Skeleton } from 'antd';

import { TableColumnDef } from './types';
import {
	getColumnInitialSize,
	getColumnMaxWidth,
	getColumnMinWidthPx,
} from './utils';

import tableStyles from './TanStackTable.module.scss';
import styles from './TanStackTableSkeleton.module.scss';

type TanStackTableSkeletonProps<TData> = {
	columns: TableColumnDef<TData>[];
	rowCount: number;
	isDarkMode: boolean;
	columnSizing?: ColumnSizingState;
};

export function TanStackTableSkeleton<TData>({
	columns,
	rowCount,
	isDarkMode,
	columnSizing,
}: TanStackTableSkeletonProps<TData>): JSX.Element {
	const rows = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [
		rowCount,
	]);

	return (
		<table className={tableStyles.tanStackTable}>
			<colgroup>
				{columns.map((column) => {
					const isFixedColumn = column.width?.fixed != null;
					const hasDefaultWidth = column.width?.default != null;
					const hasMinMax = column.width?.min != null && column.width?.max != null;
					const minWidthPx = getColumnMinWidthPx(column);
					const maxWidthPx = getColumnMaxWidth(column);
					const persistedWidth = columnSizing?.[column.id];

					// Fixed columns get exact width with no flexibility
					if (isFixedColumn) {
						const fixedWidth = column.width?.fixed;
						return (
							<col
								key={column.id}
								style={{
									width: fixedWidth,
									minWidth: fixedWidth,
									maxWidth: fixedWidth,
								}}
							/>
						);
					}

					// User has resized this column - use persisted width
					if (persistedWidth != null) {
						const width = Math.max(persistedWidth, minWidthPx);
						return (
							<col
								key={column.id}
								style={{
									width,
									minWidth: minWidthPx,
									maxWidth: maxWidthPx,
								}}
							/>
						);
					}

					// Columns with min+max but no default: auto-size within bounds
					if (hasMinMax && !hasDefaultWidth) {
						return (
							<col
								key={column.id}
								style={{
									minWidth: minWidthPx,
									maxWidth: maxWidthPx,
								}}
							/>
						);
					}

					// For other columns, use initial size with min/max constraints
					return (
						<col
							key={column.id}
							style={{
								width: getColumnInitialSize(column),
								minWidth: minWidthPx,
								maxWidth: maxWidthPx,
							}}
						/>
					);
				})}
			</colgroup>
			<thead>
				<tr>
					{columns.map((column) => (
						<th
							key={column.id}
							className={tableStyles.tableHeaderCell}
							data-dark-mode={isDarkMode}
						>
							{typeof column.header === 'function' ? (
								<Skeleton.Input active size="small" className={styles.headerSkeleton} />
							) : (
								column.header
							)}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((rowIndex) => (
					<tr key={rowIndex} className={tableStyles.tableRow}>
						{columns.map((column) => (
							<td key={column.id} className={tableStyles.tableCell}>
								<Skeleton.Input active size="small" className={styles.cellSkeleton} />
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
