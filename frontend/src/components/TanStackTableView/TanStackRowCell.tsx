import type { MouseEvent, ReactNode } from 'react';
import { memo } from 'react';
import type { Cell } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { Skeleton } from 'antd';
import cx from 'classnames';

import { useShouldShowCellSkeleton } from './TanStackTableStateContext';

import tableStyles from './TanStackTable.module.scss';
import skeletonStyles from './TanStackTableSkeleton.module.scss';

export type TanStackRowCellProps<TData> = {
	cell: Cell<TData, unknown>;
	hasSingleColumn: boolean;
	isLastCell: boolean;
	hasHovered: boolean;
	rowData: TData;
	onClick: (event: MouseEvent<HTMLTableCellElement>) => void;
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
	const showSkeleton = useShouldShowCellSkeleton();

	return (
		<td
			className={cx(tableStyles.tableCell, 'tanstack-cell-' + cell.column.id)}
			data-single-column={hasSingleColumn || undefined}
			onClick={onClick}
		>
			{showSkeleton ? (
				<Skeleton.Input
					active
					size="small"
					className={skeletonStyles.cellSkeleton}
				/>
			) : (
				flexRender(cell.column.columnDef.cell, cell.getContext())
			)}
			{isLastCell && hasHovered && renderRowActions && !showSkeleton && (
				<span className={tableStyles.tableViewRowActions}>
					{renderRowActions(rowData)}
				</span>
			)}
		</td>
	);
}

// Custom comparison - only re-render when row data changes
// If you add any new prop to context, remember to update this function
function areTanStackRowCellPropsEqual<TData>(
	prev: Readonly<TanStackRowCellProps<TData>>,
	next: Readonly<TanStackRowCellProps<TData>>,
): boolean {
	if (next.cell.id.startsWith('skeleton-')) {
		return false;
	}

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

export const TanStackRowCell =
	TanStackRowCellMemo as typeof TanStackRowCellInner;
