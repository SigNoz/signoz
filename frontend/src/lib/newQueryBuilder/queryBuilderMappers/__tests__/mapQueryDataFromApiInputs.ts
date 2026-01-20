/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

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
			reduceTo: ReduceOperators.AVG,
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
			ShiftBy: 0,
		},
	},
	panelType: PANEL_TYPES.TIME_SERIES,
	queryType: EQueryType.QUERY_BUILDER,
} as unknown) as ICompositeMetricQuery;

export const stepIntervalUnchanged = {
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
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				filter: { expression: '' },
				aggregations: [
					{
						metricName: '',
						temporality: '',
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						reduceTo: ReduceOperators.AVG,
					},
				],
				functions: [],
				filters: { op: 'AND', items: [] },
				expression: 'A',
				disabled: false,
				stepInterval: 240, // unchanged
				having: [],
				limit: 0,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: ReduceOperators.AVG,
				source: '',
				offset: 0,
				pageSize: 0,
				ShiftBy: 0,
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	queryType: 'builder',
	id: 'test-id',
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
			},
			filters: {
				op: 'AND',
				items: [
					{
						key: {
							key: 'deployment_environment',
							dataType: 'string',
							type: 'tag',
						},
						value: 'default',
						op: 'in',
					},
					{
						key: {
							key: 'service_name',
							dataType: 'string',
							type: 'tag',
						},
						value: 'frontend',
						op: 'in',
					},
					{
						key: {
							key: 'operation',
							dataType: 'string',
							type: 'tag',
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
				},
				{
					key: 'operation',
					dataType: 'string',
					type: 'tag',
				},
			],
			expression: 'A',
			disabled: false,
			legend: '{{service_name}}-{{operation}}',
			limit: 0,
			offset: 0,
			pageSize: 0,
			reduceTo: ReduceOperators.SUM,
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
			ShiftBy: 0,
		},
	},
	panelType: 'graph',
	queryType: 'builder',
} as unknown) as ICompositeMetricQuery;

export const replaceVariables = {
	builder: {
		queryData: [
			{
				dataSource: 'metrics',
				queryName: 'A',
				aggregateOperator: 'sum_rate',
				aggregateAttribute: {
					key: 'signoz_calls_total',
					dataType: 'float64',
					type: '',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				filter: { expression: '' },
				aggregations: [
					{
						metricName: '',
						temporality: '',
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						reduceTo: ReduceOperators.AVG,
					},
				],
				functions: [],
				filters: {
					op: 'AND',
					items: [
						{
							key: {
								key: 'deployment_environment',
								dataType: 'string',
								type: 'tag',
							},
							value: 'default',
							op: 'in',
						},
						{
							key: {
								key: 'service_name',
								dataType: 'string',
								type: 'tag',
							},
							value: 'frontend',
							op: 'in',
						},
						{
							key: {
								key: 'operation',
								dataType: 'string',
								type: 'tag',
							},
							value: 'HTTP GET /dispatch',
							op: 'in',
						},
					],
				},
				expression: 'A',
				disabled: false,
				stepInterval: 240,
				having: [],
				limit: 0,
				orderBy: [],
				groupBy: [
					{
						key: 'service_name',
						dataType: 'string',
						type: 'tag',
					},
					{
						key: 'operation',
						dataType: 'string',
						type: 'tag',
					},
				],
				legend: '{{service_name}}-{{operation}}',
				reduceTo: ReduceOperators.SUM,
				source: '',
				offset: 0,
				pageSize: 0,
				ShiftBy: 0,
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	queryType: 'builder',
	id: 'test-id',
	unit: undefined,
};

export const defaultOutput = {
	builder: {
		queryData: [
			{
				ShiftBy: 0,
				aggregateAttribute: {
					dataType: 'float64',
					key: 'system_disk_operations',
					type: 'Sum',
				},
				aggregations: [
					{
						metricName: '',
						reduceTo: ReduceOperators.AVG,
						spaceAggregation: 'sum',
						temporality: '',
						timeAggregation: 'count',
					},
				],
				filter: { expression: '' },
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
				reduceTo: ReduceOperators.AVG,
				source: '',
				spaceAggregation: 'sum',
				stepInterval: 240,
				timeAggregation: 'rate',
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
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
			reduceTo: ReduceOperators.AVG,
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
			reduceTo: ReduceOperators.AVG,
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

export const outputWithFunctions = {
	builder: {
		queryData: [
			{
				dataSource: 'metrics',
				queryName: 'A',
				aggregateOperator: 'count',
				aggregateAttribute: {
					key: 'signoz_latency_bucket',
					dataType: 'float64',
					type: 'Histogram',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'p90',
				filter: { expression: '' },
				aggregations: [
					{
						metricName: '',
						temporality: '',
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						reduceTo: ReduceOperators.AVG,
					},
				],
				functions: [],
				filters: { op: 'AND', items: [] },
				expression: 'A',
				disabled: false,
				stepInterval: 60,
				having: [],
				limit: 0,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: ReduceOperators.AVG,
				source: '',
				offset: 0,
				pageSize: 0,
				ShiftBy: 0,
			},
			{
				dataSource: 'metrics',
				queryName: 'B',
				aggregateOperator: 'rate',
				aggregateAttribute: {
					key: 'system_disk_io',
					dataType: 'float64',
					type: 'Sum',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				filter: { expression: '' },
				aggregations: [
					{
						metricName: '',
						temporality: '',
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						reduceTo: ReduceOperators.AVG,
					},
				],
				functions: [],
				filters: { op: 'AND', items: [] },
				expression: 'B',
				disabled: false,
				stepInterval: 120,
				having: [],
				limit: 0,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: ReduceOperators.AVG,
				source: '',
				offset: 0,
				pageSize: 0,
				ShiftBy: 0,
			},
		],
		queryFormulas: [
			{
				queryName: 'F1',
				expression: 'A / B ',
				disabled: false,
				legend: '',
				stepInterval: 1,
				dataSource: '',
				aggregateOperator: '',
				aggregateAttribute: {
					key: '',
					dataType: '',
					type: '',
				},
				limit: 0,
				offset: 0,
				pageSize: 0,
				ShiftBy: 0,
			},
		],
		queryTraceOperator: [],
	},
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	queryType: 'builder',
	id: 'test-id',
	unit: undefined,
};
