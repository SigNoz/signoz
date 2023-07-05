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
import { ResizeCallbackData } from 'react-resizable';

import ResizableHeader from './ResizableHeader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResizeTable({ columns, ...restprops }: TableProps<any>): JSX.Element {
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

	const mergeColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				onHeaderCell: (column: ColumnsType<unknown>[number]): unknown => ({
					width: column.width,
					onResize: handleResize(index),
				}),
			})),
		[columnsData, handleResize],
	);

	useEffect(() => {
		if (columns) {
			setColumns(columns);
		}
	}, [columns]);

	return (
		<Table
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...restprops}
			components={{ header: { cell: ResizableHeader } }}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			columns={mergeColumns as ColumnsType<any>}
		/>
	);
}

export default ResizeTable;
