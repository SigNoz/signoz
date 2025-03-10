import { TableProps } from 'antd';
import { ServicesList } from 'types/api/metrics/getService';

export const columns: TableProps<ServicesList>['columns'] = [
	{
		title: 'APPLICATION',
		dataIndex: 'serviceName',
		key: 'serviceName',
	},
	{
		title: 'P99 LATENCY (in ms)',
		dataIndex: 'p99',
		key: 'p99',
		render: (value: number): string => (value / 1000000).toFixed(2),
	},
	{
		title: 'ERROR RATE (% of total)',
		dataIndex: 'errorRate',
		key: 'errorRate',

		render: (value: number): string => value.toFixed(2),
	},
	{
		title: 'OPS / SEC',
		dataIndex: 'callRate',
		key: 'callRate',
		render: (value: number): string => value.toFixed(2),
	},
];
