/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */

import { Table } from 'antd';
import type { TableProps } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';
import {
	SyntheticEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import ReactDragListView from 'react-drag-listview';
import { ResizeCallbackData } from 'react-resizable';

import { dragColumnParams } from './config';
import ResizableHeader from './ResizableHeader';
import { DragSpanStyle } from './styles';

function ResizeTable({
	withDragColumn,
	columns,
	onDragColumn,
	...restProps
}: ResizeTableProps): JSX.Element {
	const [columnsData, setColumns] = useState<ColumnsType>([]);

	const handleResize = useCallback(
		(index: number) => (
			_e: SyntheticEvent<Element>,
			{ size }: ResizeCallbackData,
		): void => {
			const newColumns = [...columnsData];
			newColumns[index] = {
				...newColumns[index],
				width: size.width,
			};
			setColumns(newColumns);
		},
		[columnsData],
	);

	const handleDragEnd = useCallback(
		(fromIndex: number, toIndex: number): void => {
			const columns = [...columnsData];
			const item = columns.splice(fromIndex, 1)[0];
			columns.splice(toIndex, 0, item);
			setColumns(columns);

			if (!onDragColumn) return;

			onDragColumn(columns, fromIndex, toIndex);
		},
		[columnsData, onDragColumn],
	);

	const mergedColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				...(withDragColumn && {
					title: (
						<DragSpanStyle className="dragHandler">
							{col?.title?.toString() || ''}
						</DragSpanStyle>
					),
				}),
				onHeaderCell: (column: ColumnsType<unknown>[number]): unknown => ({
					width: column.width,
					onResize: handleResize(index),
				}),
			})) as ColumnsType<any>,
		[withDragColumn, columnsData, handleResize],
	);

	const tableParams = useMemo(
		() => ({
			...restProps,
			components: { header: { cell: ResizableHeader } },
			columns: mergedColumns,
		}),
		[mergedColumns, restProps],
	);

	useEffect(() => {
		if (columns) {
			setColumns(columns);
		}
	}, [columns]);

	return withDragColumn ? (
		<ReactDragListView.DragColumn {...dragColumnParams} onDragEnd={handleDragEnd}>
			<Table {...tableParams} />
		</ReactDragListView.DragColumn>
	) : (
		<Table {...tableParams} />
	);
}

ResizeTable.defaultProps = {
	withDragColumn: false,
	onDragColumn: undefined,
};

export interface ResizeTableProps extends TableProps<any> {
	withDragColumn?: boolean;
	onDragColumn?: (
		columns: ColumnsType,
		fromIndex: number,
		toIndex: number,
	) => void;
}

export default ResizeTable;
