import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { defaultTraceSelectedColumns } from 'container/OptionsMenu/constants';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

export const PANEL_TYPES_INITIAL_QUERY = {
	[PANEL_TYPES.TIME_SERIES]: initialQueriesMap.metrics,
	[PANEL_TYPES.VALUE]: initialQueriesMap.metrics,
	[PANEL_TYPES.TABLE]: initialQueriesMap.metrics,
	[PANEL_TYPES.LIST]: initialQueriesMap.logs,
	[PANEL_TYPES.TRACE]: initialQueriesMap.traces,
	[PANEL_TYPES.BAR]: initialQueriesMap.metrics,
	[PANEL_TYPES.PIE]: initialQueriesMap.metrics,
	[PANEL_TYPES.HISTOGRAM]: initialQueriesMap.metrics,
	[PANEL_TYPES.EMPTY_WIDGET]: initialQueriesMap.metrics,
};

export const listViewInitialLogQuery: Query = {
	...initialQueriesMap.logs,
	builder: {
		...initialQueriesMap.logs.builder,
		queryData: [
			{
				...initialQueriesMap.logs.builder.queryData[0],
				aggregateOperator: LogsAggregatorOperator.NOOP,
				orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				offset: 0,
				pageSize: 100,
			},
		],
	},
};

export const listViewInitialTraceQuery = {
	// it should be the above commented query
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: [
			{
				...initialQueriesMap.traces.builder.queryData[0],
				aggregateOperator: LogsAggregatorOperator.NOOP,
				orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				offset: 0,
				pageSize: 10,
				selectColumns: defaultTraceSelectedColumns,
			},
		],
	},
};
