import { Querybuildertypesv5QueryTypeDTO } from 'api/generated/services/sigNoz.schemas';

export enum EQueryType {
	QUERY_BUILDER = 'builder',
	CLICKHOUSE = 'clickhouse_sql',
	PROM = 'promql',
}

export const QueryMode = {
	...EQueryType,
	/** Not an `EQueryType`: AI queries are builder queries tagged `builderQueryType: builder_ai_query`. */
	AI_QUERY_BUILDER: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
} as const;

export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
