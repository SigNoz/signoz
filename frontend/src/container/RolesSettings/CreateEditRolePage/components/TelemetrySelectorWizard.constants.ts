// intentionally omitting few query types
// from pkg/types/querybuildertypes/querybuildertypesv5/query_type.go
export type QueryTypeId = 'builder_query' | 'promql' | 'clickhouse_sql';

export interface QueryTypeOption {
	id: QueryTypeId;
	label: string;
	supportsKeyScoping: boolean;
	metricsOnly?: boolean;
}

export const QUERY_TYPES: readonly QueryTypeOption[] = [
	{
		id: 'builder_query',
		label: 'Builder Query',
		supportsKeyScoping: true,
	},
	{
		id: 'promql',
		label: 'PromQL',
		supportsKeyScoping: false,
		metricsOnly: true,
	},
	{
		id: 'clickhouse_sql',
		label: 'ClickHouse SQL',
		supportsKeyScoping: false,
	},
] as const;

export const DEFAULT_QUERY_TYPE: QueryTypeId = 'builder_query';

export const SUPPORTED_GRANT_KEY = 'signoz.workspace.key.id';

export const ANY_RESOURCE_VALUE = '*';

export interface SelectorDraft {
	queryType: QueryTypeId;
	value: string;
}

export interface ParsedSelector {
	queryType?: QueryTypeId;
	value: string;
}

export interface SelectorValidation {
	message: string;
	isError: boolean;
}
