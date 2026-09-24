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
	ReduceOperators,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

export interface EntityTracesQueryParams {
	start: number;
	end: number;
	expression: string;
	offset?: number;
	pageSize?: number;
}

function buildEntityTracesQueryData(
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
		...initialQueryBuilderFormValuesMap.traces,
		queryName: 'A',
		dataSource: DataSource.TRACES,
		aggregateOperator: TracesAggregatorOperator.NOOP,
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
		],
		groupBy: [],
		legend: '',
		reduceTo: ReduceOperators.AVG,
		offset,
		pageSize,
	};
}

export function getEntityTracesQueryPayload({
	start,
	end,
	expression,
	offset = 0,
	pageSize = DEFAULT_PER_PAGE_VALUE,
}: EntityTracesQueryParams): {
	query: GetQueryResultsProps;
	queryData: IBuilderQuery;
} {
	const queryData = buildEntityTracesQueryData(expression, { offset, pageSize });

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
