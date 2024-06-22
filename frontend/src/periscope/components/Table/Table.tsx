/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-unstable-nested-components */
import './Table.styles.scss';

// needed for table body level scope DnD setup
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	useSortable,
} from '@dnd-kit/sortable';
// needed for row & cell level scope DnD setup
import { CSS } from '@dnd-kit/utilities';
import {
	Cell,
	ColumnDef,
	flexRender,
	getCoreRowModel,
	Header,
	Table,
	useReactTable,
} from '@tanstack/react-table';
import React, { CSSProperties } from 'react';

import { makeData, Person } from './makeData';

function DraggableTableHeader({
	header,
}: {
	header: Header<Person, unknown>;
}): JSX.Element {
	const {
		attributes,
		isDragging,
		listeners,
		setNodeRef,
		transform,
	} = useSortable({
		id: header.column.id,
	});

	const style: CSSProperties = {
		opacity: isDragging ? 0.8 : 1,
		position: 'relative',
		transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
		transition: 'width transform 0.2s ease-in-out',
		whiteSpace: 'nowrap',
		width: header.column.getSize(),
		zIndex: isDragging ? 1 : 0,
	};

	return (
		<th colSpan={header.colSpan} ref={setNodeRef} style={style}>
			{header.isPlaceholder
				? null
				: flexRender(header.column.columnDef.header, header.getContext())}
			<button type="button" {...attributes} {...listeners}>
				🟰
			</button>

			<div
				{...{
					onDoubleClick: (): void => header.column.resetSize(),
					onMouseDown: header.getResizeHandler(),
					onTouchStart: header.getResizeHandler(),
					className: `resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`,
				}}
			/>
		</th>
	);
}

function DragAlongCell({ cell }: { cell: Cell<Person, unknown> }): JSX.Element {
	const { isDragging, setNodeRef, transform } = useSortable({
		id: cell.column.id,
	});

	const style: CSSProperties = {
		opacity: isDragging ? 0.8 : 1,
		position: 'relative',
		transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
		transition: 'width transform 0.2s ease-in-out',
		width: cell.column.getSize(),
		zIndex: isDragging ? 1 : 0,
	};

	return (
		<td style={style} ref={setNodeRef}>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
		</td>
	);
}

// un-memoized normal table body component - see memoized version below
function TableBody({ table }: { table: Table<Person> }): JSX.Element {
	const { columnOrder } = table.getState();

	console.log('columnOrder', columnOrder);

	return (
		<div
			{...{
				className: 'tbody',
			}}
		>
			{table.getRowModel().rows.map((row) => (
				<div key={row.id} className="tr">
					{row.getVisibleCells().map((cell) => (
						<SortableContext
							key={cell.id}
							items={columnOrder}
							strategy={horizontalListSortingStrategy}
						>
							<DragAlongCell key={cell.id} cell={cell} />
						</SortableContext>
					))}
				</div>
			))}
		</div>
	);
}

// special memoized wrapper for our table body that we will use during column resizing
export const MemoizedTableBody = React.memo(
	TableBody,
	(prev, next) => prev.table.options.data === next.table.options.data,
) as typeof TableBody;

function PeriscopeTable(): JSX.Element {
	const columns = React.useMemo<ColumnDef<Person>[]>(
		() => [
			{
				accessorKey: 'firstName',
				cell: (info): any => info.getValue(),
				id: 'firstName',
				size: 150,
			},
			{
				accessorFn: (row): any => row.lastName,
				cell: (info): any => info.getValue(),
				header: (): JSX.Element => <span>Last Name</span>,
				id: 'lastName',
				size: 150,
			},
			{
				accessorKey: 'age',
				header: (): any => 'Age',
				id: 'age',
				size: 120,
			},
			{
				accessorKey: 'visits',
				header: (): JSX.Element => <span>Visits</span>,
				id: 'visits',
				size: 120,
			},
			{
				accessorKey: 'status',
				header: 'Status',
				id: 'status',
				size: 150,
			},
			{
				accessorKey: 'progress',
				header: 'Profile Progress',
				id: 'progress',
				size: 180,
			},
		],
		[],
	);
	const [data, setData] = React.useState(() => makeData(20));
	const [columnOrder, setColumnOrder] = React.useState<string[]>(() =>
		columns.map((c) => c.id!),
	);
	const [columnVisibility, setColumnVisibility] = React.useState({});

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		state: {
			columnOrder,
			columnVisibility,
		},
		defaultColumn: {
			minSize: 60,
			maxSize: 800,
		},
		columnResizeMode: 'onChange',
		onColumnOrderChange: setColumnOrder,
		onColumnVisibilityChange: setColumnVisibility,
		debugTable: true,
		debugHeaders: true,
		debugColumns: true,
	});

	/**
	 * Instead of calling `column.getSize()` on every render for every header
	 * and especially every data cell (very expensive),
	 * we will calculate all column sizes at once at the root table level in a useMemo
	 * and pass the column sizes down as CSS variables to the <table> element.
	 */
	const columnSizeVars = React.useMemo(() => {
		const headers = table.getFlatHeaders();
		const colSizes: { [key: string]: number } = {};
		for (let i = 0; i < headers.length; i++) {
			const header = headers[i]!;
			colSizes[`--header-${header.id}-size`] = header.getSize();
			colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
		}
		return colSizes;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [table.getState().columnSizingInfo, table.getState().columnSizing]);

	// reorder columns after drag & drop
	function handleDragEnd(event: DragEndEvent): void {
		const { active, over } = event;

		console.log('active', active, over);
		if (active && over && active.id !== over.id) {
			setColumnOrder((columnOrder) => {
				const oldIndex = columnOrder.indexOf(active.id as string);
				const newIndex = columnOrder.indexOf(over.id as string);
				return arrayMove(columnOrder, oldIndex, newIndex); // this is just a splice util
			});
		}
	}

	const sensors = useSensors(
		useSensor(MouseSensor, {}),
		useSensor(TouchSensor, {}),
		useSensor(KeyboardSensor, {}),
	);

	return (
		<DndContext
			collisionDetection={closestCenter}
			modifiers={[restrictToHorizontalAxis]}
			// eslint-disable-next-line react/jsx-no-bind
			onDragEnd={handleDragEnd}
			sensors={sensors}
		>
			<div className="p-2">
				<div className="overflow-x-auto">
					<div
						className="divTable"
						style={{
							...columnSizeVars, // Define column sizes on the <table> element
							width: table.getTotalSize(),
						}}
					>
						<div className="thead">
							{table.getHeaderGroups().map((headerGroup) => (
								<div key={headerGroup.id} className="tr">
									<SortableContext
										items={columnOrder}
										strategy={horizontalListSortingStrategy}
									>
										{headerGroup.headers.map((header) => (
											<div
												key={header.id}
												className="th"
												style={{
													width: `calc(var(--header-${header?.id}-size) * 1px)`,
												}}
											>
												<DraggableTableHeader key={header.id} header={header} />
											</div>
										))}
									</SortableContext>
								</div>
							))}
						</div>

						<TableBody table={table} />
					</div>
				</div>
			</div>
		</DndContext>
	);
}

export default PeriscopeTable;
