import { Query } from 'types/api/dashboard/getAll';

export type TQueryCategories = 'query_builder' | 'clickhouse_query' | 'promql';

export enum EQueryCategories {
	query_builder = 0,
	clickhouse_query,
	promql,
}

export enum EQueryTypeToQueryKeyMapping {
	QUERY_BUILDER = 'builder',
	CLICKHOUSE = 'clickHouse',
	PROM = 'promQL',
}

export interface IHandleUpdatedQuery {
	updatedQuery: Query;
}
