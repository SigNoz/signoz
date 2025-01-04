import './PerformantColumnResizingTable.styles.scss';

import {
	ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	Table,
	useReactTable,
} from '@tanstack/react-table';
import { Button } from 'antd';
import React, { useMemo, useState } from 'react';

import { makeData } from './makedata';

type Trace = {
	spanName: string;
	spanDuration: number;
};

function TableBody({ table }: { table: Table<Trace> }): JSX.Element {
	return (
		<div
			{...{
				className: 'tbody',
			}}
		>
			{table.getRowModel().rows.map((row) => (
				<div key={row.id} className="tr">
					{row.getVisibleCells().map((cell) => (
						<div
							key={cell.id}
							className="td"
							style={{
								width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
							}}
						>
							{cell.renderValue<any>()}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

const MemoizedTableBody = React.memo(
	TableBody,
	(prev, next) => prev.table.options.data === next.table.options.data,
) as typeof TableBody;

const columnHelper = createColumnHelper<Trace>();
const defaultColumns: ColumnDef<Trace>[] = [
	columnHelper.display({
		id: 'spanName',
		cell: (props): JSX.Element => <span>{props.row.original.spanName}</span>,
	}),
	columnHelper.display({
		id: 'spanDuration',
		enableResizing: false,
		cell: (props): JSX.Element => <span>{props.row.original.spanDuration}</span>,
	}),
];

export function PerformantColumnResizingTable(): JSX.Element {
	const [data, setData] = useState(() => makeData(200));
	const [columns] = useState<typeof defaultColumns>(() => [...defaultColumns]);

	const table = useReactTable({
		data,
		columns,
		defaultColumn: {
			minSize: 60,
			maxSize: 800,
		},
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
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
	const columnSizeVars = useMemo(() => {
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

	return (
		<div className="p-2">
			<pre style={{ minHeight: '10rem' }}>
				{JSON.stringify(
					{
						columnSizing: table.getState().columnSizing,
					},
					null,
					2,
				)}
			</pre>
			<Button onClick={(): void => setData(makeData(1000))}>CHange</Button>
			<div className="h-4" />({data.length} rows)
			<div className="overflow-x-auto">
				{/* Here in the <table> equivalent element (surrounds all table head and data cells), we will define our CSS variables for column sizes */}
				<div
					{...{
						className: 'divTable',
						style: {
							...columnSizeVars, // Define column sizes on the <table> element
							width: table.getTotalSize(),
						},
					}}
				>
					<div className="thead">
						{table.getHeaderGroups().map((headerGroup) => (
							<div key={headerGroup.id} className="tr">
								{headerGroup.headers.map((header) => (
									<div
										key={header.id}
										className="th"
										style={{
											width: `calc(var(--header-${header?.id}-size) * 1px)`,
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
										<div
											{...{
												onDoubleClick: (): void => header.column.resetSize(),
												onMouseDown: header.getResizeHandler(),
												onTouchStart: header.getResizeHandler(),
												className: `resizer ${
													header.column.getIsResizing() ? 'isResizing' : ''
												}`,
											}}
										/>
									</div>
								))}
							</div>
						))}
					</div>
					{/* When resizing any column we will render this special memoized version of our table body */}
					{table.getState().columnSizingInfo.isResizingColumn ? (
						<MemoizedTableBody table={table} />
					) : (
						<TableBody table={table} />
					)}
				</div>
			</div>
		</div>
	);
}
