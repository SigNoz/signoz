/* eslint-disable sonarjs/no-duplicate-string */
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export const MOCK_COORDINATES = {
	x: 996,
	y: 421,
};

export const MOCK_AGGREGATE_DATA = {
	record: {
		'service.name': 'adservice',
		trace_id: 'df2cfb0e57bb8736207689851478cd50',
		A: 3,
	},
	column: {
		dataIndex: 'A',
		title: 'count()',
		width: 145,
		isValueColumn: true,
		queryName: 'A',
	},
	tableColumns: [
		{
			dataIndex: 'service.name',
			title: 'service.name',
			width: 145,
			isValueColumn: false,
			queryName: 'A',
		},
		{
			dataIndex: 'trace_id',
			title: 'trace_id',
			width: 145,
			isValueColumn: false,
			queryName: 'A',
		},
		{
			dataIndex: 'A',
			title: 'count()',
			width: 145,
			isValueColumn: true,
			queryName: 'A',
		},
	],
};

export const MOCK_QUERY_WITH_FILTER =
	"service.name = '$service.name' AND trace_id EXISTS AND deployment.environment = '$env' service.name = 'adservice' AND trace_id = 'df2cfb0e57bb8736207689851478cd50'";

export const MOCK_FILTER_DATA = {
	record: {
		'service.name': 'adservice',
		trace_id: 'df2cfb0e57bb8736207689851478cd50',
		A: 3,
	},
	column: {
		dataIndex: 'trace_id',
		title: 'trace_id',
		width: 145,
		isValueColumn: false,
		queryName: 'A',
	},
	tableColumns: [
		{
			dataIndex: 'service.name',
			title: 'service.name',
			width: 145,
			isValueColumn: false,
			queryName: 'A',
		},
		{
			dataIndex: 'trace_id',
			title: 'trace_id',
			width: 145,
			isValueColumn: false,
			queryName: 'A',
		},
		{
			dataIndex: 'A',
			title: 'count()',
			width: 145,
			isValueColumn: true,
			queryName: 'A',
		},
	],
};

export const MOCK_QUERY = {
	queryType: EQueryType.QUERY_BUILDER,
	builder: {
		queryData: [
			{
				aggregations: [
					{
						expression: 'count()',
					},
				],
				dataSource: DataSource.LOGS,
				disabled: false,
				expression: 'A',
				filter: {
					expression:
						"service.name = '$service.name' AND trace_id EXISTS AND deployment.environment = '$env'",
				},
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: 'string',
						id: 'service.name--string--resource--false',
						isColumn: false,
						isJSON: false,
						key: 'service.name',
						type: 'resource',
					},
					{
						dataType: 'string',
						id: 'trace_id--string----true',
						isColumn: true,
						isJSON: false,
						key: 'trace_id',
					},
				],
				having: {
					expression: '',
				},
				havingExpression: {
					expression: '',
				},
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				stepInterval: 60,
			},
			{
				aggregations: [
					{
						expression: 'count()',
					},
				],
				dataSource: 'logs',
				disabled: true,
				expression: 'B',
				filter: {
					expression: '',
				},
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: 'string',
						id: 'service.name--string--resource--false',
						isColumn: false,
						isJSON: false,
						key: 'service.name',
						type: 'resource',
					},
				],
				having: {
					expression: '',
				},
				havingExpression: {
					expression: '',
				},
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'B',
				stepInterval: 60,
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
	id: '6092c3fd-6877-4cb8-836a-7f30db4e4bfe',
	promql: [
		{
			disabled: false,
			legend: '',
			name: 'A',
			query: '',
		},
	],
};
