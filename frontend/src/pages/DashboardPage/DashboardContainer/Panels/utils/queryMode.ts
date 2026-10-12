import { Querybuildertypesv5QueryTypeDTO } from 'api/generated/services/sigNoz.schemas';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export const QueryMode = {
	...EQueryType,
	/** Not an `EQueryType`: AI queries are builder queries tagged `builderQueryType: builder_ai_query`. */
	AI_QUERY_BUILDER: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
} as const;

export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];

/** Builder queries per authoring tab; `Query` has one `builder` slot, so off-screen tabs live here. */
export type BuilderStash = Partial<Record<QueryMode, Query['builder']>>;

/** Which builder mode the `builder` slot holds, whatever query type is active. */
export function getBuilderMode(builder: Query['builder']): QueryMode {
	return builder.queryData[0]?.builderQueryType === QueryMode.AI_QUERY_BUILDER
		? QueryMode.AI_QUERY_BUILDER
		: QueryMode.QUERY_BUILDER;
}

/** The tab a query belongs to: its query type, or AI when a builder query carries the tag. */
export function getQueryMode(query: Query): QueryMode {
	return query.queryType === QueryMode.QUERY_BUILDER
		? getBuilderMode(query.builder)
		: query.queryType;
}

/** Query Builder and AI both author `Query.builder`; the other modes own their own slot. */
export function isBuilderMode(mode: QueryMode): boolean {
	return mode === QueryMode.QUERY_BUILDER || mode === QueryMode.AI_QUERY_BUILDER;
}

/** Drops the AI tag, leaving the same query readable as a plain builder query. */
export function withoutAIQueryTag(query: Query): Query {
	if (getBuilderMode(query.builder) !== QueryMode.AI_QUERY_BUILDER) {
		return query;
	}
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map(
				({ builderQueryType: _tag, ...queryData }) => queryData,
			),
		},
	};
}
