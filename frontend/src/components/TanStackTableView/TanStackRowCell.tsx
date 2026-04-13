import type { ReactNode } from 'react';
import { memo } from 'react';
import type { Cell } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import cx from 'classnames';

import tableStyles from './TanStackTable.module.scss';

export type TanStackRowCellProps<TData> = {
	cell: Cell<TData, unknown>;
	hasSingleColumn: boolean;
	isLastCell: boolean;
	hasHovered: boolean;
	rowData: TData;
	onClick: () => void;
	renderRowActions?: (row: TData) => ReactNode;
};

function TanStackRowCellInner<TData>({
	cell,
	hasSingleColumn,
	isLastCell,
	hasHovered,
	rowData,
	onClick,
	renderRowActions,
}: TanStackRowCellProps<TData>): JSX.Element {
	return (
		<td
			className={cx(tableStyles.tableCell, 'tanstack-cell-' + cell.column.id)}
			data-single-column={hasSingleColumn || undefined}
			onClick={onClick}
		>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
			{isLastCell && hasHovered && renderRowActions && (
				<span className={tableStyles.tableViewRowActions}>
					{renderRowActions(rowData)}
				</span>
			)}
		</td>
	);
}

function areTanStackRowCellPropsEqual<TData>(
	prev: Readonly<TanStackRowCellProps<TData>>,
	next: Readonly<TanStackRowCellProps<TData>>,
): boolean {
	return (
		prev.cell.id === next.cell.id &&
		prev.cell.column.id === next.cell.column.id &&
		Object.is(prev.cell.getValue(), next.cell.getValue()) &&
		prev.hasSingleColumn === next.hasSingleColumn &&
		prev.isLastCell === next.isLastCell &&
		prev.hasHovered === next.hasHovered &&
		prev.onClick === next.onClick &&
		prev.renderRowActions === next.renderRowActions &&
		prev.rowData === next.rowData
	);
}

const TanStackRowCellMemo = memo(
	TanStackRowCellInner,
	areTanStackRowCellPropsEqual,
);

TanStackRowCellMemo.displayName = 'TanStackRowCell';

export const TanStackRowCell = TanStackRowCellMemo as typeof TanStackRowCellInner;
