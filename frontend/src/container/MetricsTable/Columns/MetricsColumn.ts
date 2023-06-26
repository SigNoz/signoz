import type { ColumnsType } from 'antd/es/table';
import { ServicesList } from 'types/api/metrics/getService';

import { getColumnSearchProps } from './GetColumnSearchProps';

export const columns = (search: string): ColumnsType<DataProps> => [
	{
		title: 'Application',
		dataIndex: 'serviceName',
		width: 200,
		key: 'serviceName',
		...getColumnSearchProps('serviceName', search),
	},
	{
		title: 'P99 latency (in ms)',
		dataIndex: 'p99',
		key: 'p99',
		width: 150,
		defaultSortOrder: 'descend',
		sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
		render: (value: number): string => (value / 1000000).toFixed(2),
	},
	{
		title: 'Error Rate (% of total)',
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: 150,
		sorter: (a: DataProps, b: DataProps): number => a.errorRate - b.errorRate,
		render: (value: number): string => value.toFixed(2),
	},
	{
		title: 'Operations Per Second',
		dataIndex: 'callRate',
		key: 'callRate',
		width: 150,
		sorter: (a: DataProps, b: DataProps): number => a.callRate - b.callRate,
		render: (value: number): string => value.toFixed(2),
	},
];

type DataProps = ServicesList;
