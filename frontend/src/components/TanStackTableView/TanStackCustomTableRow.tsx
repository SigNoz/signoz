import { ComponentProps, memo } from 'react';
import { TableComponents } from 'react-virtuoso';
import cx from 'classnames';

import { useClearRowHovered, useSetRowHovered } from './RowHoverContext';
import { FlatItem, TableRowContext } from './types';

import tableStyles from './TanStackTable.module.scss';

type VirtuosoTableRowProps<TData> = ComponentProps<
	NonNullable<
		TableComponents<FlatItem<TData>, TableRowContext<TData>>['TableRow']
	>
>;

function TanStackCustomTableRow<TData>({
	children,
	item,
	context,
	...props
}: VirtuosoTableRowProps<TData>): JSX.Element {
	const rowId = item.row.id;
	const rowData = item.row.original;

	// Stable callbacks for hover state management
	const setHovered = useSetRowHovered(rowId);
	const clearHovered = useClearRowHovered(rowId);

	if (item.kind === 'expansion') {
		return (
			<tr {...props} className={tableStyles.tableRowExpansion}>
				{children}
			</tr>
		);
	}

	const isActive = context?.isRowActive?.(rowData) ?? false;
	const extraClass = context?.getRowClassName?.(rowData) ?? '';
	const rowStyle = context?.getRowStyle?.(rowData);

	const rowClassName = cx(
		tableStyles.tableRow,
		isActive && tableStyles.tableRowActive,
		extraClass,
	);

	return (
		<tr
			{...props}
			className={rowClassName}
			style={rowStyle}
			onMouseEnter={setHovered}
			onMouseLeave={clearHovered}
		>
			{children}
		</tr>
	);
}

// Custom comparison - only re-render when row identity or computed values change
function areTableRowPropsEqual<TData>(
	prev: Readonly<VirtuosoTableRowProps<TData>>,
	next: Readonly<VirtuosoTableRowProps<TData>>,
): boolean {
	// Different row = must re-render
	if (prev.item.row.id !== next.item.row.id) {
		return false;
	}
	// Different kind (row vs expansion) = must re-render
	if (prev.item.kind !== next.item.kind) {
		return false;
	}
	// Same row, same kind - check if computed values would differ
	// We compare the context callbacks and row data to determine this
	const prevData = prev.item.row.original;
	const nextData = next.item.row.original;

	// Row data reference changed = potential re-render needed
	if (prevData !== nextData) {
		return false;
	}

	// Context callbacks changed = computed values may differ
	if (prev.context !== next.context) {
		// If context changed, check if the actual computed values differ
		const prevActive = prev.context?.isRowActive?.(prevData) ?? false;
		const nextActive = next.context?.isRowActive?.(nextData) ?? false;
		if (prevActive !== nextActive) {
			return false;
		}

		const prevClass = prev.context?.getRowClassName?.(prevData) ?? '';
		const nextClass = next.context?.getRowClassName?.(nextData) ?? '';
		if (prevClass !== nextClass) {
			return false;
		}

		const prevStyle = prev.context?.getRowStyle?.(prevData);
		const nextStyle = next.context?.getRowStyle?.(nextData);
		if (prevStyle !== nextStyle) {
			return false;
		}
	}

	return true;
}

export default memo(
	TanStackCustomTableRow,
	areTableRowPropsEqual,
) as typeof TanStackCustomTableRow;
