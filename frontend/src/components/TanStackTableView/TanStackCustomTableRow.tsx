import {
	ComponentProps,
	CSSProperties,
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { TableComponents } from 'react-virtuoso';
import cx from 'classnames';

import RowHoverContext from './RowHoverContext';
import { FlatItem, TableRowContext } from './types';

import tableStyles from './TanStackTable.module.scss';

type VirtuosoTableRowProps<TData> = ComponentProps<
	NonNullable<
		TableComponents<FlatItem<TData>, TableRowContext<TData>>['TableRow']
	>
>;

type StandardTableRowProps<TData> = {
	rowData: TData;
	context: VirtuosoTableRowProps<TData>['context'];
	hasHovered: boolean;
	onMouseEnter: () => void;
	children: VirtuosoTableRowProps<TData>['children'];
} & Omit<VirtuosoTableRowProps<TData>, 'children' | 'item' | 'context'>;

function TanStackStandardTableRow<TData>({
	children,
	context,
	rowData,
	hasHovered,
	onMouseEnter,
	...trProps
}: StandardTableRowProps<TData>): JSX.Element {
	const isActive = context?.isRowActive?.(rowData) ?? false;
	const extraClass = context?.getRowClassName?.(rowData) ?? '';

	const rowClassName = useMemo(
		() =>
			cx(tableStyles.tableRow, isActive && tableStyles.tableRowActive, extraClass),
		[isActive, extraClass],
	);

	const rowStyle = useMemo((): CSSProperties => {
		const style = context?.getRowStyle?.(rowData) ?? {};
		return { ...style };
	}, [context, rowData]);

	return (
		<RowHoverContext.Provider value={hasHovered}>
			<tr
				{...trProps}
				className={rowClassName}
				style={rowStyle}
				onMouseEnter={onMouseEnter}
			>
				{children}
			</tr>
		</RowHoverContext.Provider>
	);
}

function TanStackCustomTableRow<TData>({
	children,
	item,
	context,
	...props
}: VirtuosoTableRowProps<TData>): JSX.Element {
	const [hasHovered, setHasHovered] = useState(false);
	const handleMouseEnter = useCallback(() => {
		if (!hasHovered) {
			setHasHovered(true);
		}
	}, [hasHovered]);

	const rowData = item.row.original;

	if (item.kind === 'expansion') {
		return (
			<tr {...props} className={tableStyles.tableRowExpansion}>
				{children}
			</tr>
		);
	}

	return (
		<TanStackStandardTableRow<TData>
			{...props}
			context={context}
			rowData={rowData}
			hasHovered={hasHovered}
			onMouseEnter={handleMouseEnter}
		>
			{children}
		</TanStackStandardTableRow>
	);
}

export default memo(TanStackCustomTableRow) as typeof TanStackCustomTableRow;
