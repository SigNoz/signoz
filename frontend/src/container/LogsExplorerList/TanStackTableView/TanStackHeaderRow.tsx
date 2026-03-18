import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, Header as TanStackHeader } from '@tanstack/react-table';

import { TableHeaderCellStyled } from '../InfinityTableView/styles';
import { InfinityTableProps } from '../InfinityTableView/types';
import { OrderedColumn, TanStackTableRowData } from './types';
import { getColumnId } from './utils';

type TanStackHeaderRowProps = {
	column: OrderedColumn;
	header?: TanStackHeader<TanStackTableRowData, unknown>;
	isDarkMode: boolean;
	fontSize: InfinityTableProps['tableViewProps']['fontSize'];
	hasSingleColumn: boolean;
};

function TanStackHeaderRow({
	column,
	header,
	isDarkMode,
	fontSize,
	hasSingleColumn,
}: TanStackHeaderRowProps): JSX.Element {
	const columnId = getColumnId(column);
	const isDragColumn = column.key !== 'expand';
	const isResizableColumn = Boolean(header?.column.getCanResize());
	const resizeHandler = header?.getResizeHandler();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: columnId,
		disabled: !isDragColumn,
	});

	return (
		<TableHeaderCellStyled
			ref={setNodeRef}
			$isLogIndicator={column.key === 'state-indicator'}
			$isDarkMode={isDarkMode}
			$isDragColumn={isDragColumn}
			key={columnId}
			fontSize={fontSize}
			$hasSingleColumn={hasSingleColumn}
			style={{
				position: 'sticky',
				top: 0,
				zIndex: 2,
				paddingRight: isResizableColumn ? 18 : undefined,
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.85 : 1,
			}}
		>
			<span
				{...(isDragColumn ? attributes : {})}
				{...(isDragColumn ? listeners : {})}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					maxWidth: isResizableColumn ? 'calc(100% - 18px)' : '100%',
					cursor: isDragColumn ? 'grab' : 'default',
				}}
			>
				{header
					? flexRender(header.column.columnDef.header, header.getContext())
					: String(column.title || '').replace(/^\w/, (c) => c.toUpperCase())}
			</span>
			{isResizableColumn && (
				<span
					role="presentation"
					className="cursor-col-resize"
					title="Drag to resize column"
					style={{
						position: 'absolute',
						top: 0,
						right: 0,
						bottom: 0,
						width: 16,
						cursor: 'col-resize',
						zIndex: 3,
						touchAction: 'none',
					}}
					onClick={(event): void => {
						event.preventDefault();
						event.stopPropagation();
					}}
					onPointerDown={(event): void => {
						event.stopPropagation();
						resizeHandler?.(event);
					}}
					onMouseDown={(event): void => {
						event.stopPropagation();
						resizeHandler?.(event);
					}}
					onTouchStart={(event): void => {
						event.stopPropagation();
						resizeHandler?.(event);
					}}
				>
					<span
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: '50%',
							width: 1,
							transform: 'translateX(-50%)',
							background: 'var(--l2-border)',
							opacity: 1,
							pointerEvents: 'none',
						}}
					/>
				</span>
			)}
		</TableHeaderCellStyled>
	);
}

export default TanStackHeaderRow;
