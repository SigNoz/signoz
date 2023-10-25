/* eslint-disable @typescript-eslint/no-explicit-any */
import { TableProps } from 'antd';

export interface ResizeTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}

export interface DynamicColumnTableProps extends TableProps<any> {
	dynamicColumns: TableProps<any>['columns'];
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}
