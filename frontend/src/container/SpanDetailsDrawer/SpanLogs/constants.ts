import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { Filter } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a query payload for fetching logs related to a specific span
 * @param start - Start time in milliseconds
 * @param end - End time in milliseconds
 * @param filter - V5 filter expression for trace_id and span_id
 * @param order - Timestamp ordering ('desc' for newest first, 'asc' for oldest first)
 * @returns Query payload for logs API
 */
export const getSpanLogsQueryPayload = (
	start: number,
	end: number,
	filter: Filter,
	order: 'asc' | 'desc' = 'desc',
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
						type: '',
					},
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					functions: [],
					filter,
					expression: 'A',
					disabled: false,
					stepInterval: 60,
					having: [],
					limit: null,
					orderBy: [
						{
							columnName: 'timestamp',
							order,
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
			queryTraceOperator: [],
		},
		id: uuidv4(),
		queryType: EQueryType.QUERY_BUILDER,
	},
	start,
	end,
});

/**
 * Creates tag filters for querying logs by trace_id only (for context logs)
 * @param traceId - The trace identifier
 * @returns Tag filters for the query builder
 */
export const getTraceOnlyFilters = (traceId: string): TagFilter => ({
	items: [
		{
			id: uuidv4(),
			key: {
				id: uuidv4(),
				dataType: DataTypes.String,
				type: '',
				key: 'trace_id',
			},
			op: '=',
			value: traceId,
		},
	],
	op: 'AND',
});
