interface Dropdown {
	key: string;
	displayValue: string;
	yAxisUnit?: string;
}

export const groupBy: Dropdown[] = [
	{
		key: '',
		displayValue: 'None',
	},
	{
		key: 'serviceName',
		displayValue: 'Service Name',
	},

	{
		displayValue: 'Operation',
		key: 'name',
	},
	{
		displayValue: 'HTTP URL',
		key: 'httpUrl',
	},
	{
		displayValue: 'HTTP Method',
		key: 'httpMethod',
	},
	{
		displayValue: 'HTTP Host',
		key: 'httpHost',
	},
	{
		displayValue: 'HTTP Route',
		key: 'httpRoute',
	},
	{
		displayValue: 'RPC Method',
		key: 'rpcMethod',
	},
	{
		displayValue: 'Status Code',
		key: 'responseStatusCode',
	},
	{
		displayValue: 'Database Name',
		key: 'dbName',
	},
	{
		displayValue: 'Database System',
		key: 'dbSystem',
	},
	{
		displayValue: 'Database Operation',
		key: 'dbOperation',
	},
	{
		displayValue: 'Messaging System',
		key: 'msgSystem',
	},
	{
		displayValue: 'Messaging Operation',
		key: 'msgOperation',
	},
	{
		displayValue: 'Component',
		key: 'component',
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
