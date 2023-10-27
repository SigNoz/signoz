/* eslint-disable @typescript-eslint/no-explicit-any */
import { TableProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ColumnGroupType, ColumnType } from 'antd/lib/table';

import { TableDataSource } from './contants';

export interface ResizeTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}
export interface DynamicColumnTableProps extends TableProps<any> {
	tablesource: typeof TableDataSource[keyof typeof TableDataSource];
	dynamicColumns: TableProps<any>['columns'];
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
}

export type GetVisibleColumnsFunction = (
	props: GetVisibleColumnProps,
) => (ColumnGroupType<any> | ColumnType<any>)[];

export type GetVisibleColumnProps = {
	tablesource: typeof TableDataSource[keyof typeof TableDataSource];
	dynamicColumns?: ColumnsType<any>;
	columnsData?: ColumnsType;
};

export type SetVisibleColumnsProps = {
	checked: boolean;
	index: number;
	tablesource: typeof TableDataSource[keyof typeof TableDataSource];
	dynamicColumns?: ColumnsType<any>;
};
