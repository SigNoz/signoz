import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const prepareQueryWithDefaultTimestamp = (query: Query): Query => ({
	...query,
	builder: {
		...query.builder,
		queryData: query.builder.queryData?.map((item) => ({
			...item,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
		})),
	},
});

export enum ExplorerViews {
	LIST = 'list',
	TIMESERIES = 'timeseries',
	TRACE = 'trace',
	TABLE = 'table',
	CLICKHOUSE = 'clickhouse',
}
