import type { MouseEvent } from 'react';
import { memo, useCallback } from 'react';
import { Row as TanStackRowModel } from '@tanstack/react-table';

import { TanStackRowCell } from './TanStackRowCell';
import { useIsRowHovered } from './TanStackTableStateContext';
import { TableRowContext } from './types';

import tableStyles from './TanStackTable.module.scss';

type TanStackRowCellsProps<TData> = {
	row: TanStackRowModel<TData>;
	context: TableRowContext<TData> | undefined;
	itemKind: 'row' | 'expansion';
	hasSingleColumn: boolean;
	columnOrderKey: string;
	columnVisibilityKey: string;
};

function TanStackRowCellsInner<TData>({
	row,
	context,
	itemKind,
	hasSingleColumn,
	columnOrderKey: _columnOrderKey,
	columnVisibilityKey: _columnVisibilityKey,
}: TanStackRowCellsProps<TData>): JSX.Element {
	const hasHovered = useIsRowHovered(row.id);
	const rowData = row.original;
	const visibleCells = row.getVisibleCells();
	const lastCellIndex = visibleCells.length - 1;

	// Stable references via destructuring, keep them as is
	const onRowClick = context?.onRowClick;
	const onRowClickNewTab = context?.onRowClickNewTab;
	const onRowDeactivate = context?.onRowDeactivate;
	const isRowActive = context?.isRowActive;
	const getRowKeyData = context?.getRowKeyData;
	const rowIndex = row.index;

	const handleClick = useCallback(
		(event: MouseEvent<HTMLTableCellElement>) => {
			const keyData = getRowKeyData?.(rowIndex);
			const itemKey = keyData?.itemKey ?? '';

			// Handle ctrl+click or cmd+click (open in new tab)
			if ((event.ctrlKey || event.metaKey) && onRowClickNewTab) {
				onRowClickNewTab(rowData, itemKey);
				return;
			}

			const isActive = isRowActive?.(rowData) ?? false;
			if (isActive && onRowDeactivate) {
				onRowDeactivate();
			} else {
				onRowClick?.(rowData, itemKey);
			}
		},
		[
			isRowActive,
			onRowDeactivate,
			onRowClick,
			onRowClickNewTab,
			rowData,
			getRowKeyData,
			rowIndex,
		],
	);

	if (itemKind === 'expansion') {
		const keyData = getRowKeyData?.(rowIndex);
		return (
			<td
				colSpan={context?.colCount ?? 1}
				className={tableStyles.tableCellExpansion}
			>
				{context?.renderExpandedRow?.(
					rowData,
					keyData?.finalKey ?? '',
					keyData?.groupMeta,
				)}
			</td>
		);
	}

	return (
		<>
			{visibleCells.map((cell, index) => {
				const isLastCell = index === lastCellIndex;
				return (
					<TanStackRowCell
						key={cell.id}
						cell={cell}
						hasSingleColumn={hasSingleColumn}
						isLastCell={isLastCell}
						hasHovered={hasHovered}
						rowData={rowData}
						onClick={handleClick}
						renderRowActions={context?.renderRowActions}
					/>
				);
			})}
		</>
	);
}

// Custom comparison - only re-render when row data changes
// If you add any new prop to context, remember to update this function
function areRowCellsPropsEqual<TData>(
	prev: Readonly<TanStackRowCellsProps<TData>>,
	next: Readonly<TanStackRowCellsProps<TData>>,
): boolean {
	return (
		prev.row.id === next.row.id &&
		prev.itemKind === next.itemKind &&
		prev.hasSingleColumn === next.hasSingleColumn &&
		prev.columnOrderKey === next.columnOrderKey &&
		prev.columnVisibilityKey === next.columnVisibilityKey &&
		prev.context?.onRowClick === next.context?.onRowClick &&
		prev.context?.onRowClickNewTab === next.context?.onRowClickNewTab &&
		prev.context?.onRowDeactivate === next.context?.onRowDeactivate &&
		prev.context?.isRowActive === next.context?.isRowActive &&
		prev.context?.getRowKeyData === next.context?.getRowKeyData &&
		prev.context?.renderRowActions === next.context?.renderRowActions &&
		prev.context?.renderExpandedRow === next.context?.renderExpandedRow &&
		prev.context?.colCount === next.context?.colCount
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TanStackRowCells = memo(
	TanStackRowCellsInner,
	areRowCellsPropsEqual as any,
) as <T>(props: TanStackRowCellsProps<T>) => JSX.Element;

export default TanStackRowCells;
