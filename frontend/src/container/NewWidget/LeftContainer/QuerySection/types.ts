import { Query } from 'types/api/dashboard/getAll';

export enum EQueryCategories {
	query_builder = 0,
	clickhouse_query,
	promql,
}

export enum EQueryTypeToQueryKeyMapping {
	QUERY_BUILDER = 'builder',
	CLICKHOUSE = 'clickhouse_sql',
	PROM = 'promql',
}

export interface IHandleUpdatedQuery {
	updatedQuery: Query;
}
