import { ColumnsType } from 'antd/es/table';
import { ServicesList } from 'types/api/metrics/getService';

import { ColumnKey, ColumnWidth, SORTING_ORDER } from './ColumnContants';

export const baseColumnOptions: ColumnsType<ServicesList> = [
	{
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
		dataIndex: ColumnKey.ErrorRate,
		key: ColumnKey.ErrorRate,
		width: 150,
	},
	{
		dataIndex: ColumnKey.Operations,
		key: ColumnKey.Operations,
		width: ColumnWidth.Operations,
	},
];
