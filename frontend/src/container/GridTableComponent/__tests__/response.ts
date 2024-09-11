export const tableDataMultipleQueriesSuccessResponse = {
	columns: [
		{
			name: 'service_name',
			queryName: '',
			isValueColumn: false,
		},
		{
			name: 'A',
			queryName: 'A',
			isValueColumn: true,
		},
		{
			name: 'B',
			queryName: 'B',
			isValueColumn: true,
		},
	],
	rows: [
		{
			data: {
				A: 4196.71,
				B: 'n/a',
				service_name: 'demo-app',
			},
		},
		{
			data: {
				A: 500.83,
				B: 'n/a',
				service_name: 'customer',
			},
		},
		{
			data: {
				A: 499.5,
				B: 'n/a',
				service_name: 'mysql',
			},
		},
		{
			data: {
				A: 293.22,
				B: 'n/a',
				service_name: 'frontend',
			},
		},
		{
			data: {
				A: 230.03,
				B: 'n/a',
				service_name: 'driver',
			},
		},
		{
			data: {
				A: 67.09,
				B: 'n/a',
				service_name: 'route',
			},
		},
		{
			data: {
				A: 30.96,
				B: 'n/a',
				service_name: 'redis',
			},
		},
		{
			data: {
				A: 'n/a',
				B: 112.27,
				service_name: 'n/a',
			},
		},
	],
};

export const widgetQueryWithLegend = {
	clickhouse_sql: [
		{
			name: 'A',
			legend: '',
			disabled: false,
			query: '',
		},
	],
	promql: [
		{
			name: 'A',
			query: '',
			legend: '',
			disabled: false,
		},
	],
	builder: {
		queryData: [
			{
				dataSource: 'metrics',
				queryName: 'A',
				aggregateOperator: 'count',
				aggregateAttribute: {
					dataType: 'float64',
					id: 'signoz_latency--float64--ExponentialHistogram--true',
					isColumn: true,
					isJSON: false,
					key: 'signoz_latency',
					type: 'ExponentialHistogram',
				},
				timeAggregation: '',
				spaceAggregation: 'p90',
				functions: [],
				filters: {
					items: [],
					op: 'AND',
				},
				expression: 'A',
				disabled: false,
				stepInterval: 60,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [
					{
						dataType: 'string',
						isColumn: false,
						isJSON: false,
						key: 'service_name',
						type: 'tag',
						id: 'service_name--string--tag--false',
					},
				],
				legend: 'p99',
				reduceTo: 'avg',
			},
			{
				dataSource: 'metrics',
				queryName: 'B',
				aggregateOperator: 'rate',
				aggregateAttribute: {
					dataType: 'float64',
					id: 'system_disk_operations--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'system_disk_operations',
					type: 'Sum',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				functions: [],
				filters: {
					items: [],
					op: 'AND',
				},
				expression: 'B',
				disabled: false,
				stepInterval: 60,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [],
	},
	id: '48ad5a67-9a3c-49d4-a886-d7a34f8b875d',
	queryType: 'builder',
};

export const expectedOutputWithLegends = {
	dataSource: [
		{
			A: 4196.71,
			B: 'n/a',
			service_name: 'demo-app',
		},
		{
			A: 500.83,
			B: 'n/a',
			service_name: 'customer',
		},
		{
			A: 499.5,
			B: 'n/a',
			service_name: 'mysql',
		},
		{
			A: 293.22,
			B: 'n/a',
			service_name: 'frontend',
		},
		{
			A: 230.03,
			B: 'n/a',
			service_name: 'driver',
		},
		{
			A: 67.09,
			B: 'n/a',
			service_name: 'route',
		},
		{
			A: 30.96,
			B: 'n/a',
			service_name: 'redis',
		},
		{
			A: 'n/a',
			B: 112.27,
			service_name: 'n/a',
		},
	],
};
