import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { flexRender, Row as TanStackRowModel } from '@tanstack/react-table';
import cx from 'classnames';

import { useRowHover } from './RowHoverContext';
import TanStackTableText from './TanStackTableText';
import { TableRowContext } from './types';

import tableStyles from './TanStackTable.module.scss';

type TanStackRowCellsProps<TData> = {
	row: TanStackRowModel<TData>;
	context: TableRowContext<TData> | undefined;
	itemKind: 'row' | 'expansion';
	hasSingleColumn: boolean;
};

function TanStackRowCells<TData>({
	row,
	context,
	itemKind,
	hasSingleColumn,
}: TanStackRowCellsProps<TData>): JSX.Element {
	const hasHovered = useRowHover();
	const rowData = row.original;
	const visibleCells = row.getVisibleCells();
	const lastCellIndex = visibleCells.length - 1;

	const handleClick = useCallback(() => {
		const isActive = context?.isRowActive?.(rowData) ?? false;
		if (isActive && context?.onRowDeactivate) {
			context.onRowDeactivate();
		} else {
			context?.onRowClick?.(rowData);
		}
	}, [context, rowData]);

	if (itemKind === 'expansion') {
		return (
			<td
				colSpan={context?.colCount ?? 1}
				className={tableStyles.tableCellExpansion}
			>
				{context?.renderExpandedRow?.(rowData)}
			</td>
		);
	}

	return (
		<>
			{visibleCells.map((cell, index) => {
				const isLastCell = index === lastCellIndex;
				return (
					<td
						key={cell.id}
						className={cx(tableStyles.tableCell, cell.column.id)}
						data-single-column={hasSingleColumn || undefined}
						onClick={handleClick}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
						{isLastCell && hasHovered && context?.renderRowActions && (
							<span className={tableStyles.tableViewRowActions}>
								{context.renderRowActions(rowData)}
							</span>
						)}
					</td>
				);
			})}
		</>
	);
}

export default TanStackRowCells;
