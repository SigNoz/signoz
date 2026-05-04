import type {
	CSSProperties,
	MouseEvent as ReactMouseEvent,
	TouchEvent as ReactTouchEvent,
} from 'react';
import { useCallback, useMemo } from 'react';
import { CloseOutlined, MoreOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui';
import { flexRender, Header as TanStackHeader } from '@tanstack/react-table';
import cx from 'classnames';
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from 'lucide-react';

import { SortState, TableColumnDef } from './types';

import headerStyles from './TanStackHeaderRow.module.scss';
import tableStyles from './TanStackTable.module.scss';

type TanStackHeaderRowProps<TData = unknown> = {
	column: TableColumnDef<TData>;
	header?: TanStackHeader<TData, unknown>;
	isDarkMode: boolean;
	hasSingleColumn: boolean;
	canRemoveColumn?: boolean;
	onRemoveColumn?: (columnId: string) => void;
	orderBy?: SortState | null;
	onSort?: (sort: SortState | null) => void;
	/** Last column cannot be resized */
	isLastColumn?: boolean;
};

const GRIP_ICON_SIZE = 12;

const SORT_ICON_SIZE = 14;

// eslint-disable-next-line sonarjs/cognitive-complexity
function TanStackHeaderRow<TData>({
	column,
	header,
	isDarkMode,
	hasSingleColumn,
	canRemoveColumn = false,
	onRemoveColumn,
	orderBy,
	onSort,
	isLastColumn = false,
}: TanStackHeaderRowProps<TData>): JSX.Element {
	const columnId = column.id;
	const isDragColumn = column.enableMove !== false && column.pin == null;
	const isResizableColumn =
		!isLastColumn &&
		column.enableResize !== false &&
		Boolean(header?.column.getCanResize());
	const isColumnRemovable = Boolean(
		canRemoveColumn && onRemoveColumn && column.enableRemove,
	);
	const isSortable = column.enableSort === true && Boolean(onSort);
	const currentSortDirection =
		orderBy?.columnName === columnId ? orderBy.order : null;
	const isResizing = Boolean(header?.column.getIsResizing());
	const resizeHandler = header?.getResizeHandler();
	const headerText =
		typeof column.header === 'string' && column.header
			? column.header
			: String(header?.id ?? columnId);
	const headerTitleAttr = headerText.replace(/^\w/, (c) => c.toUpperCase());

	const handleSortClick = useCallback((): void => {
		if (!isSortable || !onSort) {
			return;
		}
		if (currentSortDirection === null) {
			onSort({ columnName: columnId, order: 'asc' });
		} else if (currentSortDirection === 'asc') {
			onSort({ columnName: columnId, order: 'desc' });
		} else {
			onSort(null);
		}
	}, [isSortable, onSort, currentSortDirection, columnId]);

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
			}) as CSSProperties,
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
		isSortable && headerStyles.isSortable,
	);

	const thClassName = cx(
		tableStyles.tableHeaderCell,
		headerCellClassName,
		column.id,
	);

	return (
		<th
			ref={setNodeRef}
			className={thClassName}
			key={columnId}
			style={headerCellStyle}
			data-dark-mode={isDarkMode}
			data-single-column={hasSingleColumn || undefined}
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
								(typeof column.header === 'string' && column.header) ||
									header?.id ||
									columnId,
							)} column`}
							className={headerStyles.tanstackGripActivator}
						>
							<GripVertical size={GRIP_ICON_SIZE} />
						</span>
					</span>
				) : null}
				{isSortable ? (
					<button
						type="button"
						className={cx(
							'tanstack-header-title',
							headerStyles.tanstackSortButton,
							currentSortDirection && headerStyles.isSorted,
						)}
						title={headerTitleAttr}
						onClick={handleSortClick}
						data-sort={
							currentSortDirection === 'asc'
								? 'ascending'
								: currentSortDirection === 'desc'
									? 'descending'
									: 'none'
						}
					>
						<span className={headerStyles.tanstackSortLabel}>
							{header?.column?.columnDef
								? flexRender(header.column.columnDef.header, header.getContext())
								: typeof column.header === 'function'
									? column.header()
									: String(column.header || '').replace(/^\w/, (c) => c.toUpperCase())}
						</span>
						<span
							className={headerStyles.tanstackSortIndicator}
							data-sort-direction={currentSortDirection || 'none'}
						>
							{currentSortDirection === 'asc' ? (
								<ArrowUp size={SORT_ICON_SIZE} />
							) : currentSortDirection === 'desc' ? (
								<ArrowDown size={SORT_ICON_SIZE} />
							) : (
								<ArrowUpDown size={SORT_ICON_SIZE} />
							)}
						</span>
					</button>
				) : (
					<span
						className={cx('tanstack-header-title', headerStyles.tanstackHeaderTitle)}
						title={headerTitleAttr}
					>
						{header?.column?.columnDef
							? flexRender(header.column.columnDef.header, header.getContext())
							: typeof column.header === 'function'
								? column.header()
								: String(column.header || '').replace(/^\w/, (c) => c.toUpperCase())}
					</span>
				)}
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
									onRemoveColumn?.(column.id);
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
