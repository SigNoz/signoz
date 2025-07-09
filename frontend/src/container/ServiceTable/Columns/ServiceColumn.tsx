import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type { ColumnsType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { Link } from 'react-router-dom';
import { ServicesList } from 'types/api/metrics/getService';

import { Name } from '../styles';
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

// Utility to convert AntD columns to ColumnDef (minimal for your columns)
const columnHelper = createColumnHelper<ServicesList>();
export const getTableColumns = (
	search: string,
): ColumnDef<ServicesList, any>[] => [
	columnHelper.accessor(ColumnKey.Application, {
		header: ColumnTitle[ColumnKey.Application],
		cell: (info) => {
			const metrics = info.getValue();
			const urlParams = new URLSearchParams(search);
			const availableParams = routeConfig[ROUTES.SERVICE_METRICS];
			const queryString = getQueryString(availableParams, urlParams);
			return (
				<Link to={`${ROUTES.APPLICATION}/${metrics}?${queryString.join('')}`}>
					<Name>{metrics}</Name>
				</Link>
			);
		},
		enableColumnFilter: true, // Enable filtering only for this column
	}),
	columnHelper.accessor(ColumnKey.P99, {
		header: ColumnTitle[ColumnKey.P99],
		cell: (info) => (info.getValue() / 1000000).toFixed(2),
		sortingFn: 'basic',
		enableColumnFilter: false,
	}),
	columnHelper.accessor(ColumnKey.ErrorRate, {
		header: ColumnTitle[ColumnKey.ErrorRate],
		cell: (info) => info.getValue().toFixed(2),
		sortingFn: 'basic',
		enableColumnFilter: false,
	}),
	columnHelper.accessor(ColumnKey.Operations, {
		header: ColumnTitle[ColumnKey.Operations],
		cell: (info) => info.getValue().toFixed(2),
		sortingFn: 'basic',
		enableColumnFilter: false,
	}),
];
