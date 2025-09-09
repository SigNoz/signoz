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
	"service.name in $service.name AND trace_id EXISTS AND deployment.environment = '$env' service.name = 'adservice' AND trace_id = 'df2cfb0e57bb8736207689851478cd50'";

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
						"service.name in $service.name AND trace_id EXISTS AND deployment.environment = '$env'",
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
		queryTraceOperator: [],
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

export const MOCK_KEY_SUGGESTIONS_RESPONSE = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			resource: [
				{
					name: 'service.name',
					label: 'Service Name',
					type: 'resource',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
				{
					name: 'deployment.environment',
					label: 'Environment',
					type: 'resource',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			attribute: [
				{
					name: 'http.method',
					label: 'HTTP Method',
					type: 'attribute',
					signal: 'logs',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
				{
					name: 'http.status_code',
					label: 'HTTP Status Code',
					type: 'attribute',
					signal: 'logs',
					fieldContext: 'attribute',
					fieldDataType: 'number',
				},
			],
		},
	},
};

export const MOCK_KEY_SUGGESTIONS_SEARCH_RESPONSE = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			resource: [
				{
					name: 'service.name',
					label: 'Service Name',
					type: 'resource',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
				{
					name: 'deployment.environment',
					label: 'Environment',
					type: 'resource',
					signal: 'logs',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
			],
		},
	},
};

export const MOCK_KEY_SUGGESTIONS_SINGLE_RESPONSE = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			resource: [
				{
					name: 'deployment.environment',
					label: 'Environment',
					type: 'resource',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
		},
	},
};

export const MOCK_QUERY_RANGE_REQUEST = {
	schemaVersion: 'v1',
	start: 1756972732000,
	end: 1756974532000,
	requestType: 'scalar',
	compositeQuery: {
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'logs',
					stepInterval: 60,
					disabled: false,
					filter: {
						expression:
							'service.name EXISTS AND trace_id EXISTS AND k8s.pod.name EXISTS service.name in $service.name',
					},
					groupBy: [
						{
							name: 'service.name',
							fieldDataType: 'string',
							fieldContext: 'resource',
						},
						{
							name: 'trace_id',
							fieldDataType: 'string',
							fieldContext: '',
						},
						{
							name: 'k8s.pod.name',
							fieldDataType: 'string',
							fieldContext: 'resource',
						},
					],
					having: {
						expression: '',
					},
					aggregations: [
						{
							expression: 'count()',
						},
					],
				},
			},
		],
	},
	formatOptions: {
		formatTableResultForUI: true,
		fillGaps: false,
	},
	variables: {
		SIGNOZ_START_TIME: {
			value: 1756972732000,
		},
		SIGNOZ_END_TIME: {
			value: 1756974532000,
		},
		'service.name': {
			value: '__all__',
			type: 'dynamic',
		},
	},
};
