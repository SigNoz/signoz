interface Dropdown {
	key: string;
	displayValue: string;
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
		key: 'operation',
	},
	{
		displayValue: 'HTTP url',
		key: 'httpUrl',
	},
	{
		displayValue: 'HTTP method',
		key: 'httpUrl',
	},
	{
		displayValue: 'HTTP host',
		key: 'httpHost',
	},
	{
		displayValue: 'HTTP route',
		key: 'httpRoute',
	},
	{
		displayValue: 'HTTP status code',
		key: 'httpCode',
	},
	{
		displayValue: 'Database name',
		key: 'dbName',
	},
	{
		displayValue: 'Database operation',
		key: 'dbSystem',
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
	{
		key: '',
		displayValue: 'None',
	},
	{ displayValue: 'Count', key: 'count' },
	{ displayValue: 'Rate per sec', key: 'ratePerSec' },
	{ displayValue: 'Sum(duration)', key: 'sum' },
	{ displayValue: 'Avg(duration)', key: 'avg' },
	{
		displayValue: 'Max(duration)',
		key: 'max',
	},
	{
		displayValue: 'Min(duration)',
		key: 'min',
	},
	{
		displayValue: '50th percentile(duration)',
		key: 'p50',
	},
	{
		displayValue: '90th percentile(duration',
		key: 'p90',
	},
	{
		displayValue: '95th percentile(duration)',
		key: 'p95',
	},
	{
		displayValue: '99th percentile(duration)',
		key: 'p99',
	},
];
