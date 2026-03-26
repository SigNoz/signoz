import type {
	CSSProperties,
	MouseEvent as ReactMouseEvent,
	TouchEvent as ReactTouchEvent,
} from 'react';
import { useMemo } from 'react';
import { CloseOutlined, MoreOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/popover';
import { flexRender, Header as TanStackHeader } from '@tanstack/react-table';
import { GripVertical } from 'lucide-react';

import { TableHeaderCellStyled } from '../InfinityTableView/styles';
import { InfinityTableProps } from '../InfinityTableView/types';
import { OrderedColumn, TanStackTableRowData } from './types';
import { getColumnId } from './utils';

import './styles/TanStackHeaderRow.styles.scss';

type TanStackHeaderRowProps = {
	column: OrderedColumn;
	header?: TanStackHeader<TanStackTableRowData, unknown>;
	isDarkMode: boolean;
	fontSize: InfinityTableProps['tableViewProps']['fontSize'];
	hasSingleColumn: boolean;
	canRemoveColumn?: boolean;
	onRemoveColumn?: (columnKey: string) => void;
};

const GRIP_ICON_SIZE = 12;
// eslint-disable-next-line sonarjs/cognitive-complexity
function TanStackHeaderRow({
	column,
	header,
	isDarkMode,
	fontSize,
	hasSingleColumn,
	canRemoveColumn = false,
	onRemoveColumn,
}: TanStackHeaderRowProps): JSX.Element {
	const columnId = getColumnId(column);
	const isDragColumn =
		column.key !== 'expand' && column.key !== 'state-indicator';
	const isResizableColumn = Boolean(header?.column.getCanResize());
	const isColumnRemovable = Boolean(
		canRemoveColumn &&
			onRemoveColumn &&
			column.key !== 'expand' &&
			column.key !== 'state-indicator',
	);
	const isResizing = Boolean(header?.column.getIsResizing());
	const resizeHandler = header?.getResizeHandler();
	const headerText =
		typeof column.title === 'string' && column.title
			? column.title
			: String(header?.id ?? columnId);
	const headerTitleAttr = headerText.replace(/^\w/, (c) => c.toUpperCase());
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
	const headerCellStyle = useMemo(
		() =>
			({
				'--tanstack-header-translate-x': `${Math.round(transform?.x ?? 0)}px`,
				'--tanstack-header-translate-y': `${Math.round(transform?.y ?? 0)}px`,
				'--tanstack-header-transition': isResizing ? 'none' : transition || 'none',
			} as CSSProperties),
		[isResizing, transform?.x, transform?.y, transition],
	);
	const headerCellClassName = [
		'tanstack-header-cell',
		isDragging ? 'is-dragging' : '',
		isResizing ? 'is-resizing' : '',
	]
		.filter(Boolean)
		.join(' ');
	const headerContentClassName = [
		'tanstack-header-content',
		isResizableColumn ? 'has-resize-control' : '',
		isColumnRemovable ? 'has-action-control' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<TableHeaderCellStyled
			ref={setNodeRef}
			$isLogIndicator={column.key === 'state-indicator'}
			$isDarkMode={isDarkMode}
			$isDragColumn={false}
			className={headerCellClassName}
			key={columnId}
			fontSize={fontSize}
			$hasSingleColumn={hasSingleColumn}
			style={headerCellStyle}
		>
			<span className={headerContentClassName}>
				{isDragColumn ? (
					<span className="tanstack-grip-slot">
						<span
							ref={setActivatorNodeRef}
							{...attributes}
							{...listeners}
							role="button"
							aria-label={`Drag ${String(
								column.title || header?.id || columnId,
							)} column`}
							className="tanstack-grip-activator"
						>
							<GripVertical size={GRIP_ICON_SIZE} />
						</span>
					</span>
				) : null}
				<span className="tanstack-header-title" title={headerTitleAttr}>
					{header
						? flexRender(header.column.columnDef.header, header.getContext())
						: String(column.title || '').replace(/^\w/, (c) => c.toUpperCase())}
				</span>
				{isColumnRemovable && (
					<Popover>
						<PopoverTrigger asChild>
							<span
								role="button"
								aria-label={`Column actions for ${headerTitleAttr}`}
								className="tanstack-header-action-trigger"
								onMouseDown={(event): void => {
									event.stopPropagation();
								}}
							>
								<MoreOutlined />
							</span>
						</PopoverTrigger>
						<PopoverContent
							align="end"
							sideOffset={6}
							className="tanstack-column-actions-content"
						>
							<button
								type="button"
								className="tanstack-remove-column-action"
								onClick={(event): void => {
									event.preventDefault();
									event.stopPropagation();
									onRemoveColumn?.(String(column.key));
								}}
							>
								<CloseOutlined className="tanstack-remove-column-action-icon" />
								Remove column
							</button>
						</PopoverContent>
					</Popover>
				)}
			</span>
			{isResizableColumn && (
				<span
					role="presentation"
					className="cursor-col-resize"
					title="Drag to resize column"
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
					<span className="tanstack-resize-handle-line" />
				</span>
			)}
		</TableHeaderCellStyled>
	);
}

export default TanStackHeaderRow;
