import { ComponentProps, memo } from 'react';
import { TableComponents } from 'react-virtuoso';
import cx from 'classnames';

import TanStackRowCells from './TanStackRow';
import {
	useClearRowHovered,
	useSetRowHovered,
} from './TanStackTableStateContext';
import { FlatItem, TableRowContext } from './types';

import tableStyles from './TanStackTable.module.scss';

type VirtuosoTableRowProps<TData> = ComponentProps<
	NonNullable<
		TableComponents<FlatItem<TData>, TableRowContext<TData>>['TableRow']
	>
>;

function TanStackCustomTableRow<TData>({
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
				<TanStackRowCells
					row={item.row}
					itemKind={item.kind}
					context={context}
					hasSingleColumn={context?.hasSingleColumn ?? false}
					columnOrderKey={context?.columnOrderKey ?? ''}
					columnVisibilityKey={context?.columnVisibilityKey ?? ''}
				/>
			</tr>
		);
	}

	const isActive = context?.isRowActive?.(rowData) ?? false;
	const extraClass = context?.getRowClassName?.(rowData) ?? '';
	const rowStyle = context?.getRowStyle?.(rowData);
	const enableAlternatingRowColors =
		context?.enableAlternatingRowColors ?? false;

	const rowClassName = cx(
		tableStyles.tableRow,
		isActive && tableStyles.tableRowActive,
		enableAlternatingRowColors &&
			(item.row.index % 2 === 0
				? tableStyles.tableRowEven
				: tableStyles.tableRowOdd),
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
			<TanStackRowCells
				row={item.row}
				itemKind={item.kind}
				context={context}
				hasSingleColumn={context?.hasSingleColumn ?? false}
				columnOrderKey={context?.columnOrderKey ?? ''}
				columnVisibilityKey={context?.columnVisibilityKey ?? ''}
			/>
		</tr>
	);
}

// Custom comparison - only re-render when row identity or computed values change
// This looks overkill but ensures the table is stable and doesn't re-render on every change
// If you add any new prop to context, remember to update this function
// eslint-disable-next-line sonarjs/cognitive-complexity
function areTableRowPropsEqual<TData>(
	prev: Readonly<VirtuosoTableRowProps<TData>>,
	next: Readonly<VirtuosoTableRowProps<TData>>,
): boolean {
	if (prev.item.row.id !== next.item.row.id) {
		return false;
	}
	if (prev.item.kind !== next.item.kind) {
		return false;
	}

	const prevData = prev.item.row.original;
	const nextData = next.item.row.original;

	if (prevData !== nextData) {
		return false;
	}

	if (prev.context?.hasSingleColumn !== next.context?.hasSingleColumn) {
		return false;
	}
	if (prev.context?.columnOrderKey !== next.context?.columnOrderKey) {
		return false;
	}
	if (prev.context?.columnVisibilityKey !== next.context?.columnVisibilityKey) {
		return false;
	}
	if (
		prev.context?.enableAlternatingRowColors !==
		next.context?.enableAlternatingRowColors
	) {
		return false;
	}

	if (prev.context !== next.context) {
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
