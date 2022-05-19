export type TQueryCategories = 'query_builder' | 'clickhouse_query' | 'promql';

export enum EQueryCategories {
	query_builder = 0,
	clickhouse_query,
	promql,
}
