// intentionally omitting few query types
// from pkg/types/querybuildertypes/querybuildertypesv5/query_type.go
export type QueryTypeId =
	| 'builder_query'
	| 'builder_sub_query'
	| 'promql'
	| 'clickhouse_sql';

export interface QueryTypeOption {
	id: QueryTypeId;
	label: string;
	description: string;
	supportsKeyScoping: boolean;
}

export const QUERY_TYPES: readonly QueryTypeOption[] = [
	{
		id: 'builder_query',
		label: 'Builder Query',
		description:
			'Visual query builder for selecting data sources, filters, and aggregations',
		supportsKeyScoping: true,
	},
	{
		id: 'builder_sub_query',
		label: 'Builder Sub Query',
		description:
			'Nested queries within the builder (e.g., subqueries referencing other queries)',
		supportsKeyScoping: true,
	},
	{
		id: 'promql',
		label: 'PromQL',
		description:
			'Raw Prometheus query language for metrics (cannot be key-scoped)',
		supportsKeyScoping: false,
	},
	{
		id: 'clickhouse_sql',
		label: 'ClickHouse SQL',
		description: 'Direct SQL queries against ClickHouse (cannot be key-scoped)',
		supportsKeyScoping: false,
	},
] as const;

export type ScopeMode = 'all' | 'byKey';
