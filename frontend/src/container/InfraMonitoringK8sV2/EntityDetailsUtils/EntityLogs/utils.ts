import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	LogsAggregatorOperator,
	ReduceOperators,
} from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

export interface EntityLogsQueryParams {
	start: number;
	end: number;
	expression: string;
	offset?: number;
	pageSize?: number;
}

function buildEntityLogsQueryData(
	expression: string,
	{
		offset,
		pageSize,
	}: {
		offset: number;
		pageSize: number;
	},
): IBuilderQuery {
	return {
		...initialQueryBuilderFormValuesMap.logs,
		queryName: 'A',
		dataSource: DataSource.LOGS,
		aggregateOperator: LogsAggregatorOperator.NOOP,
		aggregateAttribute: {
			id: '------false',
			dataType: DataTypes.String,
			key: '',
			type: '',
		},
		timeAggregation: 'rate',
		spaceAggregation: 'sum',
		functions: [],
		aggregations: [],
		filter: { expression },
		expression,
		having: {
			expression: '',
		},
		disabled: false,
		stepInterval: 60,
		limit: null,
		orderBy: [
			{
				columnName: 'timestamp',
				order: 'desc',
			},
			{
				columnName: 'id',
				order: 'desc',
			},
		],
		groupBy: [],
		legend: '',
		reduceTo: ReduceOperators.AVG,
		offset,
		pageSize,
	};
}

export function getEntityLogsQueryPayload({
	start,
	end,
	expression,
	offset = 0,
	pageSize = DEFAULT_PER_PAGE_VALUE,
}: EntityLogsQueryParams): {
	query: GetQueryResultsProps;
	queryData: IBuilderQuery;
} {
	const queryData = buildEntityLogsQueryData(expression, { offset, pageSize });

	return {
		query: {
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			query: {
				clickhouse_sql: [],
				promql: [],
				builder: {
					queryData: [queryData],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				id: uuidv4(),
				queryType: EQueryType.QUERY_BUILDER,
			},
			start,
			end,
		},
		queryData,
	};
}
