import type { ColumnsType } from 'antd/es/table';
import { ServicesList } from 'types/api/metrics/getService';

import {
	ColumnKey,
	ColumnTitle,
	ColumnWidth,
	SORTING_ORDER,
} from './ColumnContants';
import { getColumnSearchProps } from './GetColumnSearchProps';

export const getColumns = (search: string): ColumnsType<ServicesList> => [
	{
		title: ColumnTitle[ColumnKey.Application],
		dataIndex: ColumnKey.Application,
		width: ColumnWidth.Application,
		key: ColumnKey.Application,
		...getColumnSearchProps('serviceName', search),
	},
	{
		title: ColumnTitle[ColumnKey.P99],
		dataIndex: ColumnKey.P99,
		key: ColumnKey.P99,
		width: ColumnWidth.P99,
		defaultSortOrder: SORTING_ORDER,
		sorter: (a: ServicesList, b: ServicesList): number => a.p99 - b.p99,
		render: (value: number): string => (value / 1000000).toFixed(2),
	},
	{
		title: ColumnTitle[ColumnKey.ErrorRate],
		dataIndex: ColumnKey.ErrorRate,
		key: ColumnKey.ErrorRate,
		width: 150,
		sorter: (a: ServicesList, b: ServicesList): number =>
			a.errorRate - b.errorRate,
		render: (value: number): string => value.toFixed(2),
	},
	{
		title: ColumnTitle[ColumnKey.Operations],
		dataIndex: ColumnKey.Operations,
		key: ColumnKey.Operations,
		width: ColumnWidth.Operations,
		sorter: (a: ServicesList, b: ServicesList): number => a.callRate - b.callRate,
		render: (value: number): string => value.toFixed(2),
	},
];
