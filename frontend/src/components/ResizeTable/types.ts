import { TableProps } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ResizeTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}
