import './TableV3.styles.scss';

import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	Table,
	useReactTable,
} from '@tanstack/react-table';
import React, { useMemo } from 'react';

// here we are manually rendering the table body so that we can memoize the same for performant re-renders
function TableBody<T>({ table }: { table: Table<T> }): JSX.Element {
	return (
		<div className="div-tbody">
			{table.getRowModel().rows.map((row) => (
				<div key={row.id} className="div-tr">
					{row.getVisibleCells().map((cell) => (
						<div
							key={cell.id}
							className="div-td"
							// we are manually setting the column width here based on the calculated column vars
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

// memoize the table body based on the data object being passed to the table
const MemoizedTableBody = React.memo(
	TableBody,
	(prev, next) => prev.table.options.data === next.table.options.data,
) as typeof TableBody;

interface ITableConfig {
	defaultColumnMinSize: number;
	defaultColumnMaxSize: number;
}
interface ITableV3Props<T> {
	columns: ColumnDef<T, any>[];
	data: T[];
	config: ITableConfig;
}

export function TableV3<T>(props: ITableV3Props<T>): JSX.Element {
	const { data, columns, config } = props;

	const table = useReactTable({
		data,
		columns,
		defaultColumn: {
			minSize: config.defaultColumnMinSize,
			maxSize: config.defaultColumnMaxSize,
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
			{/* Here in the <table> equivalent element (surrounds all table head and data cells), we will define our CSS variables for column sizes */}
			<div
				className="div-table"
				style={{
					...columnSizeVars, // Define column sizes on the <table> element
					width: table.getTotalSize(),
				}}
			>
				<div className="div-thead">
					{table.getHeaderGroups().map((headerGroup) => (
						<div key={headerGroup.id} className="div-tr">
							{headerGroup.headers.map((header) => (
								<div
									key={header.id}
									className="div-th"
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
	);
}
