import { ColumnsType } from 'antd/es/table';
import { useCallback } from 'react';

const useDragColumns = (columns: ColumnsType): UseDragColumns =>
	useCallback(
		(fromIndex: number, toIndex: number): ColumnsType => {
			const columnsData = [...columns];
			const item = columnsData.splice(fromIndex, 1)[0];
			columnsData.splice(toIndex, 0, item);

			return columnsData;
		},
		[columns],
	);

type UseDragColumns = (fromIndex: number, toIndex: number) => ColumnsType;

export default useDragColumns;
