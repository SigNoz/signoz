import { useMemo } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';
import { Skeleton } from 'antd';

import { TableColumnDef } from './types';
import { getColumnWidthStyle } from './utils';

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
	const rows = useMemo(
		() => Array.from({ length: rowCount }, (_, i) => i),
		[rowCount],
	);

	return (
		<table className={tableStyles.tanStackTable}>
			<colgroup>
				{columns.map((column, index) => (
					<col
						key={column.id}
						style={getColumnWidthStyle(
							column,
							columnSizing?.[column.id],
							index === columns.length - 1,
						)}
					/>
				))}
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
