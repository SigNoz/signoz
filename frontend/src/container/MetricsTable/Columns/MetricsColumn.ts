import type { ColumnsType } from 'antd/es/table';
import { ServicesList } from 'types/api/metrics/getService';

import {
	ColumnDataIndex,
	ColumnKey,
	ColumnTitle,
	ColumnWidth,
	SORTING_ORDER,
} from './ColumnContants';
import { getColumnSearchProps } from './GetColumnSearchProps';

export const columns = (search: string): ColumnsType<DataProps> => [
	{
		title: ColumnTitle.Application,
		dataIndex: ColumnDataIndex.Application,
		width: ColumnWidth.Application,
		key: ColumnKey.Application,
		...getColumnSearchProps('serviceName', search),
	},
	{
		title: ColumnTitle.P99,
		dataIndex: ColumnDataIndex.P99,
		key: ColumnKey.P99,
		width: ColumnWidth.P99,
		defaultSortOrder: SORTING_ORDER,
		sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
		render: (value: number): string => (value / 1000000).toFixed(2),
	},
	{
		title: ColumnTitle.ErrorRate,
		dataIndex: ColumnDataIndex.ErrorRate,
		key: ColumnKey.ErrorRate,
		width: 150,
		sorter: (a: DataProps, b: DataProps): number => a.errorRate - b.errorRate,
		render: (value: number): string => value.toFixed(2),
	},
	{
		title: ColumnTitle.Operations,
		dataIndex: ColumnDataIndex.Operations,
		key: ColumnKey.Operations,
		width: ColumnWidth.Operations,
		sorter: (a: DataProps, b: DataProps): number => a.callRate - b.callRate,
		render: (value: number): string => value.toFixed(2),
	},
];

type DataProps = ServicesList;
