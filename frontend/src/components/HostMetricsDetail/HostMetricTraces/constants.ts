import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { nanoToMilli } from 'utils/timeUtils';

export const columns = [
	{
		dataIndex: 'timestamp',
		key: 'timestamp',
		title: 'Timestamp',
		width: 200,
		render: (timestamp: string): string => new Date(timestamp).toLocaleString(),
	},
	{
		title: 'Service Name',
		dataIndex: ['data', 'serviceName'],
		key: 'serviceName-string-tag',
		width: 150,
	},
	{
		title: 'Name',
		dataIndex: ['data', 'name'],
		key: 'name-string-tag',
		width: 145,
	},
	{
		title: 'Duration',
		dataIndex: ['data', 'durationNano'],
		key: 'durationNano-float64-tag',
		width: 145,
		render: (duration: number): string => `${nanoToMilli(duration)}ms`,
	},
	{
		title: 'HTTP Method',
		dataIndex: ['data', 'httpMethod'],
		key: 'httpMethod-string-tag',
		width: 145,
	},
	{
		title: 'Status Code',
		dataIndex: ['data', 'responseStatusCode'],
		key: 'responseStatusCode-string-tag',
		width: 145,
	},
];

export const selectedColumns: BaseAutocompleteData[] = [
	{
		key: 'timestamp',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
	},
	{
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
	},
];

export const getHostTracesQueryPayload = (
	start: number,
	end: number,
	offset = 0,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps => ({
	query: {
		promql: [],
		clickhouse_sql: [],
		builder: {
			queryData: [
				{
					dataSource: DataSource.TRACES,
					queryName: 'A',
					aggregateOperator: 'noop',
					aggregateAttribute: {
						id: '------false',
						dataType: DataTypes.EMPTY,
						key: '',
						type: '',
					},
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					functions: [],
					filters,
					expression: 'A',
					disabled: false,
					stepInterval: 60,
					having: [],
					limit: null,
					orderBy: [
						{
							columnName: 'timestamp',
							order: 'desc',
						},
					],
					groupBy: [],
					legend: '',
					reduceTo: 'avg',
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		id: '572f1d91-6ac0-46c0-b726-c21488b34434',
		queryType: EQueryType.QUERY_BUILDER,
	},
	graphType: PANEL_TYPES.LIST,
	selectedTime: 'GLOBAL_TIME',
	start,
	end,
	params: {
		dataSource: DataSource.TRACES,
	},
	tableParams: {
		pagination: {
			limit: 10,
			offset,
		},
		selectColumns: [
			{
				key: 'serviceName',
				dataType: 'string',
				type: 'tag',
				id: 'serviceName--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'name',
				dataType: 'string',
				type: 'tag',
				id: 'name--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'durationNano',
				dataType: 'float64',
				type: 'tag',
				id: 'durationNano--float64--tag--true',
				isIndexed: false,
			},
			{
				key: 'httpMethod',
				dataType: 'string',
				type: 'tag',
				id: 'httpMethod--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'responseStatusCode',
				dataType: 'string',
				type: 'tag',
				id: 'responseStatusCode--string--tag--true',
				isIndexed: false,
			},
		],
	},
});
