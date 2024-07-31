/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export const compositeQueryWithoutVariables = ({
	builderQueries: {
		A: {
			queryName: 'A',
			stepInterval: 240,
			dataSource: DataSource.METRICS,
			aggregateOperator: 'rate',
			aggregateAttribute: {
				key: 'system_disk_operations',
				dataType: DataTypes.Float64,
				type: 'Sum',
				isColumn: true,
				isJSON: false,
			},
			filters: {
				op: 'AND',
				items: [],
			},
			expression: 'A',
			disabled: false,
			limit: 0,
			offset: 0,
			pageSize: 0,
			reduceTo: 'avg',
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
			ShiftBy: 0,
		},
	},
	panelType: PANEL_TYPES.TIME_SERIES,
	queryType: EQueryType.QUERY_BUILDER,
} as unknown) as ICompositeMetricQuery;

export const widgetQueryWithoutVariables = ({
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
				aggregateOperator: 'rate',
				aggregateAttribute: {
					key: 'system_disk_operations',
					dataType: 'float64',
					type: 'Sum',
					isColumn: true,
					isJSON: false,
					id: 'system_disk_operations--float64--Sum--true',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
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
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [],
	},
	id: '2bbbd8d8-db99-40be-b9c6-9e197c5bc537',
	queryType: 'builder',
} as unknown) as Query;

export const stepIntervalUnchanged = {
	builder: {
		queryData: [
			{
				aggregateAttribute: {
					dataType: 'float64',
					id: 'system_disk_operations--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'system_disk_operations',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: 'metrics',
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
		queryFormulas: [],
	},
	clickhouse_sql: [
		{
			disabled: false,
			legend: '',
			name: 'A',
			query: '',
		},
	],
	id: 'test-id',
	promql: [
		{
			disabled: false,
			legend: '',
			name: 'A',
			query: '',
		},
	],
	queryType: 'builder',
	unit: undefined,
};

export const compositeQueryWithVariables = ({
	builderQueries: {
		A: {
			queryName: 'A',
			stepInterval: 240,
			dataSource: 'metrics',
			aggregateOperator: 'sum_rate',
			aggregateAttribute: {
				key: 'signoz_calls_total',
				dataType: 'float64',
				type: '',
				isColumn: true,
				isJSON: false,
			},
			filters: {
				op: 'AND',
				items: [
					{
						key: {
							key: 'deployment_environment',
							dataType: 'string',
							type: 'tag',
							isColumn: false,
							isJSON: false,
						},
						value: 'default',
						op: 'in',
					},
					{
						key: {
							key: 'service_name',
							dataType: 'string',
							type: 'tag',
							isColumn: false,
							isJSON: false,
						},
						value: 'frontend',
						op: 'in',
					},
					{
						key: {
							key: 'operation',
							dataType: 'string',
							type: 'tag',
							isColumn: false,
							isJSON: false,
						},
						value: 'HTTP GET /dispatch',
						op: 'in',
					},
				],
			},
			groupBy: [
				{
					key: 'service_name',
					dataType: 'string',
					type: 'tag',
					isColumn: false,
					isJSON: false,
				},
				{
					key: 'operation',
					dataType: 'string',
					type: 'tag',
					isColumn: false,
					isJSON: false,
				},
			],
			expression: 'A',
			disabled: false,
			legend: '{{service_name}}-{{operation}}',
			limit: 0,
			offset: 0,
			pageSize: 0,
			reduceTo: 'sum',
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
			ShiftBy: 0,
		},
	},
	panelType: 'graph',
	queryType: 'builder',
} as unknown) as ICompositeMetricQuery;

export const widgetQueryWithVariables = ({
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
				aggregateOperator: 'sum_rate',
				aggregateAttribute: {
					dataType: 'float64',
					id: 'signoz_calls_total--float64----true',
					isColumn: true,
					isJSON: false,
					key: 'signoz_calls_total',
					type: '',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				functions: [],
				filters: {
					items: [
						{
							id: 'aa56621e',
							key: {
								dataType: 'string',
								id: 'deployment_environment--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'deployment_environment',
								type: 'tag',
							},
							op: 'in',
							value: ['{{.deployment_environment}}'],
						},
						{
							id: '97055a02',
							key: {
								dataType: 'string',
								id: 'service_name--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'service_name',
								type: 'tag',
							},
							op: 'in',
							value: ['{{.service_name}}'],
						},
						{
							id: '8c4599f2',
							key: {
								dataType: 'string',
								id: 'operation--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'operation',
								type: 'tag',
							},
							op: 'in',
							value: ['{{.endpoint}}'],
						},
					],
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
					{
						dataType: 'string',
						isColumn: false,
						isJSON: false,
						key: 'operation',
						type: 'tag',
						id: 'operation--string--tag--false',
					},
				],
				legend: '{{service_name}}-{{operation}}',
				reduceTo: 'sum',
			},
		],
		queryFormulas: [],
	},
	id: '64fcd7be-61d0-4f92-bbb2-1449b089f766',
	queryType: 'builder',
} as unknown) as Query;

export const replaceVariables = {
	builder: {
		queryData: [
			{
				aggregateAttribute: {
					dataType: 'float64',
					id: 'signoz_calls_total--float64----true',
					isColumn: true,
					isJSON: false,
					key: 'signoz_calls_total',
					type: '',
				},
				aggregateOperator: 'sum_rate',
				dataSource: 'metrics',
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							key: {
								dataType: 'string',
								isColumn: false,
								isJSON: false,
								key: 'deployment_environment',
								type: 'tag',
							},
							op: 'in',
							value: 'default',
						},
						{
							key: {
								dataType: 'string',
								isColumn: false,
								isJSON: false,
								key: 'service_name',
								type: 'tag',
							},
							op: 'in',
							value: 'frontend',
						},
						{
							key: {
								dataType: 'string',
								isColumn: false,
								isJSON: false,
								key: 'operation',
								type: 'tag',
							},
							op: 'in',
							value: 'HTTP GET /dispatch',
						},
					],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: 'string',
						id: 'service_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'service_name',
						type: 'tag',
					},
					{
						dataType: 'string',
						id: 'operation--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'operation',
						type: 'tag',
					},
				],
				having: [],
				legend: '{{service_name}}-{{operation}}',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'sum',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
		queryFormulas: [],
	},
	clickhouse_sql: [
		{
			disabled: false,
			legend: '',
			name: 'A',
			query: '',
		},
	],
	id: 'test-id',
	promql: [
		{
			disabled: false,
			legend: '',
			name: 'A',
			query: '',
		},
	],
	queryType: 'builder',
	unit: undefined,
};

export const defaultOutput = {
	builder: {
		queryData: [
			{
				ShiftBy: 0,
				aggregateAttribute: {
					dataType: 'float64',
					isColumn: true,
					isJSON: false,
					key: 'system_disk_operations',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: 'metrics',
				disabled: false,
				expression: 'A',
				filters: { items: [], op: 'AND' },
				functions: [],
				groupBy: [],
				having: [],
				legend: '',
				limit: 0,
				offset: 0,
				orderBy: [],
				pageSize: 0,
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 240,
				timeAggregation: 'rate',
			},
		],
		queryFormulas: [],
	},
	clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
	id: 'test-id',
	promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
	queryType: 'builder',
	unit: undefined,
};

export const compositeQueriesWithFunctions = ({
	builderQueries: {
		A: {
			queryName: 'A',
			stepInterval: 60,
			dataSource: 'metrics',
			aggregateOperator: 'count',
			aggregateAttribute: {
				key: 'signoz_latency_bucket',
				dataType: 'float64',
				type: 'Histogram',
				isColumn: true,
				isJSON: false,
			},
			filters: {
				op: 'AND',
				items: [],
			},
			expression: 'A',
			disabled: false,
			limit: 0,
			offset: 0,
			pageSize: 0,
			reduceTo: 'avg',
			spaceAggregation: 'p90',
			ShiftBy: 0,
		},
		B: {
			queryName: 'B',
			stepInterval: 120,
			dataSource: 'metrics',
			aggregateOperator: 'rate',
			aggregateAttribute: {
				key: 'system_disk_io',
				dataType: 'float64',
				type: 'Sum',
				isColumn: true,
				isJSON: false,
			},
			filters: {
				op: 'AND',
				items: [],
			},
			expression: 'B',
			disabled: false,
			limit: 0,
			offset: 0,
			pageSize: 0,
			reduceTo: 'avg',
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
			ShiftBy: 0,
		},
		F1: {
			queryName: 'F1',
			stepInterval: 1,
			dataSource: '',
			aggregateOperator: '',
			aggregateAttribute: {
				key: '',
				dataType: '',
				type: '',
				isColumn: false,
				isJSON: false,
			},
			expression: 'A / B ',
			disabled: false,
			limit: 0,
			offset: 0,
			pageSize: 0,
			ShiftBy: 0,
		},
	},
	panelType: 'graph',
	queryType: 'builder',
} as unknown) as ICompositeMetricQuery;

export const widgetQueriesWithFunctions = ({
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
					id: 'signoz_latency_bucket--float64--Histogram--true',
					isColumn: true,
					isJSON: false,
					key: 'signoz_latency_bucket',
					type: 'Histogram',
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
				stepInterval: 120,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
			{
				dataSource: 'metrics',
				queryName: 'B',
				aggregateOperator: 'rate',
				aggregateAttribute: {
					key: 'system_disk_io',
					dataType: 'float64',
					type: 'Sum',
					isColumn: true,
					isJSON: false,
					id: 'system_disk_io--float64--Sum--true',
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
				stepInterval: 120,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [
			{
				queryName: 'F1',
				expression: 'A / B ',
				disabled: false,
				legend: '',
			},
		],
	},
	id: '5d1844fe-9b44-4f15-b6fe-f1b843550b77',
	queryType: 'builder',
} as unknown) as Query;

export const outputWithFunctions = {
	builder: {
		queryData: [
			{
				dataSource: 'metrics',
				queryName: 'A',
				aggregateOperator: 'count',
				aggregateAttribute: {
					dataType: 'float64',
					id: 'signoz_latency_bucket--float64--Histogram--true',
					isColumn: true,
					isJSON: false,
					key: 'signoz_latency_bucket',
					type: 'Histogram',
				},
				timeAggregation: '',
				spaceAggregation: 'p90',
				functions: [],
				filters: {
					op: 'AND',
					items: [],
				},
				expression: 'A',
				disabled: false,
				stepInterval: 120,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
			{
				dataSource: 'metrics',
				queryName: 'B',
				aggregateOperator: 'rate',
				aggregateAttribute: {
					key: 'system_disk_io',
					dataType: 'float64',
					type: 'Sum',
					isColumn: true,
					isJSON: false,
					id: 'system_disk_io--float64--Sum--true',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				functions: [],
				filters: {
					op: 'AND',
					items: [],
				},
				expression: 'B',
				disabled: false,
				stepInterval: 120,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [
			{
				queryName: 'F1',
				expression: 'A / B ',
				disabled: false,
				legend: '',
			},
		],
	},
	clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
	id: 'test-id',
	promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
	queryType: 'builder',
	unit: undefined,
};
