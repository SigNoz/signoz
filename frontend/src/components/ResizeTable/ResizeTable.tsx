/* eslint-disable react/jsx-props-no-spreading */

import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { dragColumnParams } from 'hooks/useDragColumns/configs';
import { set } from 'lodash-es';
import {
	SyntheticEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import ReactDragListView from 'react-drag-listview';
import { ResizeCallbackData } from 'react-resizable';

import ResizableHeader from './ResizableHeader';
import { DragSpanStyle } from './styles';
import { ResizeTableProps } from './types';

function ResizeTable({
	columns,
	onDragColumn,
	pagination,
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

	const mergedColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				...(onDragColumn && {
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
		[columnsData, onDragColumn, handleResize],
	);

	const tableParams = useMemo(() => {
		const props = {
			...restProps,
			components: { header: { cell: ResizableHeader } },
			columns: mergedColumns,
		};

		set(
			props,
			'pagination',
			pagination ? { ...pagination, hideOnSinglePage: true } : false,
		);

		return props;
	}, [mergedColumns, pagination, restProps]);

	useEffect(() => {
		if (columns) {
			setColumns(columns);
		}
	}, [columns]);

	return onDragColumn ? (
		<ReactDragListView.DragColumn {...dragColumnParams} onDragEnd={onDragColumn}>
			<Table {...tableParams} />
		</ReactDragListView.DragColumn>
	) : (
		<Table {...tableParams} />
	);
}

ResizeTable.defaultProps = {
	onDragColumn: undefined,
};

export default ResizeTable;
