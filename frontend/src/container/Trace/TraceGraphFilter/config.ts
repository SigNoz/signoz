import { DefaultOptionType } from 'antd/es/select';

interface Dropdown {
	key: string;
	displayValue: string;
	yAxisUnit?: string;
}

export const groupBy: DefaultOptionType[] = [
	{
		label: 'None',
		value: 'none',
	},
	{
		label: 'Service Name',
		value: 'serviceName',
	},
	{
		label: 'Operation',
		value: 'name',
	},
	{
		label: 'HTTP URL',
		value: 'httpUrl',
	},
	{
		label: 'HTTP Method',
		value: 'httpMethod',
	},
	{
		label: 'HTTP Host',
		value: 'httpHost',
	},
	{
		label: 'HTTP Route',
		value: 'httpRoute',
	},
	{
		label: 'RPC Method',
		value: 'rpcMethod',
	},
	{
		label: 'Status Code',
		value: 'responseStatusCode',
	},
	{
		label: 'Database Name',
		value: 'dbName',
	},
	{
		label: 'Database System',
		value: 'dbSystem',
	},
	{
		label: 'Database Operation',
		value: 'dbOperation',
	},
	{
		label: 'Messaging System',
		value: 'msgSystem',
	},
	{
		label: 'Messaging Operation',
		value: 'msgOperation',
	},
];

export const functions: Dropdown[] = [
	{ displayValue: 'Count', key: 'count', yAxisUnit: 'short' },
	{
		displayValue: 'Rate per sec',
		key: 'ratePerSec',
		yAxisUnit: 'reqps',
	},
	{ displayValue: 'Sum (duration)', key: 'sum', yAxisUnit: 'ns' },
	{ displayValue: 'Avg (duration)', key: 'avg', yAxisUnit: 'ns' },
	{
		displayValue: 'Max (duration)',
		key: 'max',
		yAxisUnit: 'ns',
	},
	{
		displayValue: 'Min (duration)',
		key: 'min',
		yAxisUnit: 'ns',
	},
	{
		displayValue: '50th percentile (duration)',
		key: 'p50',
		yAxisUnit: 'ns',
	},
	{
		displayValue: '90th percentile (duration)',
		key: 'p90',
		yAxisUnit: 'ns',
	},
	{
		displayValue: '95th percentile (duration)',
		key: 'p95',
		yAxisUnit: 'ns',
	},
	{
		displayValue: '99th percentile (duration)',
		key: 'p99',
		yAxisUnit: 'ns',
	},
];
