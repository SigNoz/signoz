import { Querybuildertypesv5QueryTypeDTO } from 'api/generated/services/sigNoz.schemas';

export enum EQueryType {
	QUERY_BUILDER = 'builder',
	CLICKHOUSE = 'clickhouse_sql',
	PROM = 'promql',
}

export const QueryMode = {
	...EQueryType,
	/** `AI_QUERY_BUILDER` is not an `EQueryType`: its queries are builder queries tagged via `builderQueryType` so we can use the value of
	 * `builder_ai_query` to identify them. in future we can add more query types to the builder and use the value of `builderQueryType`
	 *  to identify them. */
	AI_QUERY_BUILDER: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
} as const;

export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
