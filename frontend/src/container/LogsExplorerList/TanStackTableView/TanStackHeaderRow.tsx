import {
	MouseEvent as ReactMouseEvent,
	TouchEvent as ReactTouchEvent,
} from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { flexRender, Header as TanStackHeader } from '@tanstack/react-table';
import { GripVertical } from 'lucide-react';

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

const DEFAULT_RESIZE_HANDLE_WIDTH = 24;
/** Wider hit target for body column (last data col before sticky row actions). */
const BODY_RESIZE_HANDLE_WIDTH = 30;
const GRIP_ICON_SIZE = 12;
const GRIP_SLOT_WIDTH = 18;
// eslint-disable-next-line sonarjs/cognitive-complexity
function TanStackHeaderRow({
	column,
	header,
	isDarkMode,
	fontSize,
	hasSingleColumn,
}: TanStackHeaderRowProps): JSX.Element {
	const columnId = getColumnId(column);
	const isDragColumn =
		column.key !== 'expand' && column.key !== 'state-indicator';
	const isResizableColumn = Boolean(header?.column.getCanResize());
	const isResizing = Boolean(header?.column.getIsResizing());
	const resizeHandler = header?.getResizeHandler();
	const resizeHandleWidth =
		column.key === 'body'
			? BODY_RESIZE_HANDLE_WIDTH
			: DEFAULT_RESIZE_HANDLE_WIDTH;
	const handleResizeStart = (
		event: ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>,
	): void => {
		event.preventDefault();
		event.stopPropagation();
		resizeHandler?.(event);
	};
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
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
			$isDragColumn={false}
			key={columnId}
			fontSize={fontSize}
			$hasSingleColumn={hasSingleColumn}
			style={{
				// Sticky header + containing block for absolute resize handle
				position: 'sticky',
				top: 0,
				zIndex: 2,
				padding: 0,
				paddingRight: isResizableColumn ? resizeHandleWidth : undefined,
				transform: transform
					? `translate3d(${Math.round(transform.x)}px, ${Math.round(
							transform.y,
					  )}px, 0)`
					: undefined,
				transition: isResizing ? 'none' : transition,
				opacity: isDragging ? 0.85 : 1,
				background: isResizing
					? isDarkMode
						? 'var(--bg-slate-500)'
						: 'var(--bg-vanilla-300)'
					: undefined,
			}}
		>
			<span
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					height: '100%',
					maxWidth: isResizableColumn
						? `calc(100% - ${resizeHandleWidth}px)`
						: '100%',
					cursor: 'default',
				}}
			>
				{isDragColumn ? (
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: GRIP_SLOT_WIDTH,
							height: GRIP_SLOT_WIDTH,
							marginRight: 4,
							flexShrink: 0,
						}}
					>
						<span
							ref={setActivatorNodeRef}
							{...attributes}
							{...listeners}
							role="button"
							aria-label={`Drag ${String(
								column.title || header?.id || columnId,
							)} column`}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: GRIP_ICON_SIZE,
								height: GRIP_ICON_SIZE,
								cursor: 'grab',
								color: 'var(--text-vanilla-400)',
								opacity: 0.9,
								touchAction: 'none',
							}}
						>
							<GripVertical size={GRIP_ICON_SIZE} />
						</span>
					</span>
				) : null}
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
						width: resizeHandleWidth,
						cursor: 'col-resize',
						zIndex: 10,
						touchAction: 'none',
						background: isResizing ? 'rgba(76, 110, 245, 0.14)' : 'transparent',
					}}
					onClick={(event): void => {
						event.preventDefault();
						event.stopPropagation();
					}}
					onMouseDown={(event): void => {
						handleResizeStart(event);
					}}
					onTouchStart={(event): void => {
						handleResizeStart(event);
					}}
				>
					<span
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: '50%',
							width: isResizing ? 2 : 1,
							transform: 'translateX(-50%)',
							background: isResizing ? 'var(--bg-robin-500)' : 'var(--l2-border)',
							opacity: 1,
							pointerEvents: 'none',
							transition: isResizing
								? 'none'
								: 'background 120ms ease, width 120ms ease',
						}}
					/>
				</span>
			)}
		</TableHeaderCellStyled>
	);
}

export default TanStackHeaderRow;
