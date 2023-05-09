import { Query } from 'types/api/dashboard/getAll';

export enum EQueryCategories {
	query_builder = 0,
	clickhouse_query,
	promql,
}

export interface IHandleUpdatedQuery {
	updatedQuery: Query;
}
