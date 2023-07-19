import { ColumnsType } from 'antd/es/table';

export type UseDragColumns<T> = {
	draggedColumns: ColumnsType<T>;
	onDragColumns: (
		columns: ColumnsType<T>,
		fromIndex: number,
		toIndex: number,
	) => void;
};
