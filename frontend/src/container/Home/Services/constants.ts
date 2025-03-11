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

export const TIME_PICKER_OPTIONS = [
	{
		value: 60 * 5 * 1000,
		label: 'Last 5 minutes',
	},
	{
		value: 60 * 15 * 1000,
		label: 'Last 15 minutes',
	},
	{
		value: 60 * 30 * 1000,
		label: 'Last 30 minutes',
	},
	{
		value: 60 * 60 * 1000,
		label: 'Last 1 hour',
	},
	{
		value: 60 * 60 * 6 * 1000,
		label: 'Last 6 hours',
	},
	{
		value: 60 * 60 * 24 * 1000,
		label: 'Last 1 day',
	},
	{
		value: 60 * 60 * 24 * 3 * 1000,
		label: 'Last 3 days',
	},
	{
		value: 60 * 60 * 24 * 7 * 1000,
		label: 'Last 1 week',
	},
	{
		value: 60 * 60 * 24 * 30 * 1000,
		label: 'Last 1 month',
	},
];
