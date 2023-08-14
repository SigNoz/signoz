import { ColumnsType } from 'antd/es/table';
import { ServicesList } from 'types/api/metrics/getService';

import {
	ColumnKey,
	ColumnTitle,
	ColumnWidth,
	SORTING_ORDER,
} from './ColumnContants';

export const baseColumnOptions: ColumnsType<ServicesList> = [
	{
		title: ColumnTitle[ColumnKey.Application],
		dataIndex: ColumnKey.Application,
		width: ColumnWidth.Application,
		key: ColumnKey.Application,
	},
	{
		dataIndex: ColumnKey.P99,
		key: ColumnKey.P99,
		width: ColumnWidth.P99,
		defaultSortOrder: SORTING_ORDER,
	},
	{
		title: ColumnTitle[ColumnKey.ErrorRate],
		dataIndex: ColumnKey.ErrorRate,
		key: ColumnKey.ErrorRate,
		width: 150,
	},
	{
		title: ColumnTitle[ColumnKey.Operations],
		dataIndex: ColumnKey.Operations,
		key: ColumnKey.Operations,
		width: ColumnWidth.Operations,
	},
];
