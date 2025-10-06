/* eslint-disable sonarjs/no-duplicate-string */
export const tableDataMultipleQueriesSuccessResponse = {
	columns: [
		{
			name: 'service_name',
			queryName: '',
			isValueColumn: false,
			id: 'service_name',
		},
		{
			name: 'A',
			queryName: 'A',
			isValueColumn: true,
			id: 'A',
		},
		{
			name: 'B',
			queryName: 'B',
			isValueColumn: true,
			id: 'B',
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
		queryTraceOperator: [],
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

// QB v5 Aggregations Mock Data
export const tableDataQBv5MultiAggregations = {
	columns: [
		{
			name: 'service.name',
			queryName: 'A',
			isValueColumn: false,
			id: 'service.name',
		},
		{
			name: 'host.name',
			queryName: 'A',
			isValueColumn: false,
			id: 'host.name',
		},
		{
			name: 'count()',
			queryName: 'A',
			isValueColumn: true,
			id: 'A.count()',
		},
		{
			name: 'count_distinct(app.ads.count)',
			queryName: 'A',
			isValueColumn: true,
			id: 'A.count_distinct(app.ads.count)',
		},
		{
			name: 'count()',
			queryName: 'B',
			isValueColumn: true,
			id: 'B.count()',
		},
		{
			name: 'count_distinct(app.ads.count)',
			queryName: 'B',
			isValueColumn: true,
			id: 'B.count_distinct(app.ads.count)',
		},
		{
			name: 'count()',
			queryName: 'C',
			isValueColumn: true,
			id: 'C.count()',
		},
		{
			name: 'count_distinct(app.ads.count)',
			queryName: 'C',
			isValueColumn: true,
			id: 'C.count_distinct(app.ads.count)',
		},
	],
	rows: [
		{
			data: {
				'service.name': 'frontend-proxy',
				'host.name': 'test-host.name',
				'A.count()': 144679,
				'A.count_distinct(app.ads.count)': 0,
				'B.count()': 144679,
				'B.count_distinct(app.ads.count)': 0,
				'C.count()': 144679,
				'C.count_distinct(app.ads.count)': 0,
			},
		},
		{
			data: {
				'service.name': 'frontend',
				'host.name': 'test-host.name',
				'A.count()': 142311,
				'A.count_distinct(app.ads.count)': 0,
				'B.count()': 142311,
				'B.count_distinct(app.ads.count)': 0,
				'C.count()': 142311,
				'C.count_distinct(app.ads.count)': 0,
			},
		},
	],
};

export const widgetQueryQBv5MultiAggregations = {
	clickhouse_sql: [
		{
			name: 'A',
			legend: 'p99',
			disabled: false,
			query: '',
		},
		{
			name: 'B',
			legend: '',
			disabled: false,
			query: '',
		},
		{
			name: 'C',
			legend: 'max',
			disabled: false,
			query: '',
		},
	],
	promql: [
		{
			name: 'A',
			query: '',
			legend: 'p99',
			disabled: false,
		},
		{
			name: 'B',
			query: '',
			legend: '',
			disabled: false,
		},
		{
			name: 'C',
			query: '',
			legend: 'max',
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
						key: 'service.name',
						type: 'tag',
						id: 'service.name--string--tag--false',
					},
					{
						dataType: 'string',
						key: 'host.name',
						type: 'tag',
						id: 'host.name--string--tag--false',
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
				groupBy: [
					{
						dataType: 'string',
						key: 'service.name',
						type: 'tag',
						id: 'service.name--string--tag--false',
					},
					{
						dataType: 'string',
						key: 'host.name',
						type: 'tag',
						id: 'host.name--string--tag--false',
					},
				],
				legend: '',
				reduceTo: 'avg',
			},
			{
				dataSource: 'metrics',
				queryName: 'C',
				aggregateOperator: 'count',
				aggregateAttribute: {
					dataType: 'float64',
					id: 'signoz_latency--float64--ExponentialHistogram--true',
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
				expression: 'C',
				disabled: false,
				stepInterval: 60,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [
					{
						dataType: 'string',
						key: 'service.name',
						type: 'tag',
						id: 'service.name--string--tag--false',
					},
					{
						dataType: 'string',
						key: 'host.name',
						type: 'tag',
						id: 'host.name--string--tag--false',
					},
				],
				legend: 'max',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	id: 'qb-v5-multi-aggregations-test',
	queryType: 'builder',
};

export const expectedOutputQBv5MultiAggregations = {
	dataSource: [
		{
			'service.name': 'frontend-proxy',
			'host.name': 'test-host.name',
			'A.count()': 144679,
			'A.count_distinct(app.ads.count)': 0,
			'B.count()': 144679,
			'B.count_distinct(app.ads.count)': 0,
			'C.count()': 144679,
			'C.count_distinct(app.ads.count)': 0,
		},
		{
			'service.name': 'frontend',
			'host.name': 'test-host.name',
			'A.count()': 142311,
			'A.count_distinct(app.ads.count)': 0,
			'B.count()': 142311,
			'B.count_distinct(app.ads.count)': 0,
			'C.count()': 142311,
			'C.count_distinct(app.ads.count)': 0,
		},
	],
};
