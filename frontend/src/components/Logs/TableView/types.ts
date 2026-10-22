import { TableColumnType as ColumnType } from 'antd';

export type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;
