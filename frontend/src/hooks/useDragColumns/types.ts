import type { TableColumnsType as ColumnsType } from 'antd';

export type UseDragColumns<T> = {
	draggedColumns: ColumnsType<T>;
	onDragColumns: (
		columns: ColumnsType<T>,
		fromIndex: number,
		toIndex: number,
	) => void;
	onColumnOrderChange: (newColumns: ColumnsType<T>) => void;
};
