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
import cx from 'classnames';
import { GripVertical } from 'lucide-react';

import {
	OrderedColumn,
	TanStackTableProps,
	TanStackTableRowData,
} from './types';
import { getColumnId } from './utils';

import headerStyles from './TanStackHeaderRow.module.scss';
import tableStyles from './TanStackTable.module.scss';

type TanStackHeaderRowProps = {
	column: OrderedColumn;
	header?: TanStackHeader<TanStackTableRowData, unknown>;
	isDarkMode: boolean;
	fontSize: TanStackTableProps['tableViewProps']['fontSize'];
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
	const headerCellClassName = cx(
		headerStyles.tanstackHeaderCell,
		isDragging && headerStyles.isDragging,
		isResizing && headerStyles.isResizing,
	);
	const headerContentClassName = cx(
		headerStyles.tanstackHeaderContent,
		isResizableColumn && headerStyles.hasResizeControl,
		isColumnRemovable && headerStyles.hasActionControl,
	);

	const isLogIndicator = column.key === 'state-indicator';
	const isTimestamp = column.key === 'timestamp';

	const thClassName = useMemo(
		() => cx(tableStyles.tableHeaderCell, headerCellClassName),
		[headerCellClassName],
	);

	return (
		<th
			ref={setNodeRef}
			className={thClassName}
			key={columnId}
			style={headerCellStyle}
			data-dark-mode={isDarkMode}
			data-log-indicator={isLogIndicator || undefined}
			data-timestamp={isTimestamp || undefined}
			data-single-column={hasSingleColumn || undefined}
			data-font-size={fontSize}
		>
			<span className={headerContentClassName}>
				{isDragColumn ? (
					<span className={headerStyles.tanstackGripSlot}>
						<span
							ref={setActivatorNodeRef}
							{...attributes}
							{...listeners}
							role="button"
							aria-label={`Drag ${String(
								column.title || header?.id || columnId,
							)} column`}
							className={headerStyles.tanstackGripActivator}
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
								className={headerStyles.tanstackHeaderActionTrigger}
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
							className={headerStyles.tanstackColumnActionsContent}
						>
							<button
								type="button"
								className={headerStyles.tanstackRemoveColumnAction}
								onClick={(event): void => {
									event.preventDefault();
									event.stopPropagation();
									onRemoveColumn?.(String(column.key));
								}}
							>
								<CloseOutlined
									className={headerStyles.tanstackRemoveColumnActionIcon}
								/>
								Remove column
							</button>
						</PopoverContent>
					</Popover>
				)}
			</span>
			{isResizableColumn && (
				<span
					role="presentation"
					className={headerStyles.cursorColResize}
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
					<span className={headerStyles.tanstackResizeHandleLine} />
				</span>
			)}
		</th>
	);
}

export default TanStackHeaderRow;
