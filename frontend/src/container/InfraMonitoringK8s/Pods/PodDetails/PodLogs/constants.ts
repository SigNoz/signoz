import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

export const getHostLogsQueryPayload = (
	start: number,
	end: number,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps => ({
	graphType: PANEL_TYPES.LIST,
	selectedTime: 'GLOBAL_TIME',
	query: {
		clickhouse_sql: [],
		promql: [],
		builder: {
			queryData: [
				{
					dataSource: DataSource.LOGS,
					queryName: 'A',
					aggregateOperator: 'noop',
					aggregateAttribute: {
						id: '------false',
						dataType: DataTypes.String,
						key: '',
						isColumn: false,
						type: '',
						isJSON: false,
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
					offset: 0,
					pageSize: 100,
				},
			],
			queryFormulas: [],
		},
		id: uuidv4(),
		queryType: EQueryType.QUERY_BUILDER,
	},
	params: {
		lastLogLineTimestamp: null,
	},
	start,
	end,
});
