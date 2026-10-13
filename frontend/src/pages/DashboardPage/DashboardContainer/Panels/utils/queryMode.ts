import { Querybuildertypesv5QueryTypeDTO } from 'api/generated/services/sigNoz.schemas';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export const QueryMode = {
	...EQueryType,
	/** Not an `EQueryType`: AI queries are builder queries tagged `builderQueryType: builder_ai_query`. */
	AI_QUERY_BUILDER: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
} as const;

export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];

/** Query Builder and AI share `Query.builder`; the variant says which one it holds. */
export const BuilderVariant = {
	MAIN: 'main',
	AI: 'ai',
} as const;

export type BuilderVariant =
	(typeof BuilderVariant)[keyof typeof BuilderVariant];

/** Builder queries per variant; `Query` has one `builder` slot, so the off-screen variant lives here. */
export type BuildersByVariant = Partial<
	Record<BuilderVariant, Query['builder']>
>;

/** Which variant the `builder` slot holds, whatever query type is active. */
export function getBuilderVariant(builder: Query['builder']): BuilderVariant {
	return builder.queryData[0]?.builderQueryType === QueryMode.AI_QUERY_BUILDER
		? BuilderVariant.AI
		: BuilderVariant.MAIN;
}

/** The variant a tab authors; `undefined` for tabs that own their own slot. */
export function toBuilderVariant(mode: QueryMode): BuilderVariant | undefined {
	if (mode === QueryMode.AI_QUERY_BUILDER) {
		return BuilderVariant.AI;
	}
	return mode === QueryMode.QUERY_BUILDER ? BuilderVariant.MAIN : undefined;
}

/** The tab a query belongs to: its query type, or AI when a builder query carries the tag. */
export function getQueryMode(query: Query): QueryMode {
	if (query.queryType !== QueryMode.QUERY_BUILDER) {
		return query.queryType;
	}
	return getBuilderVariant(query.builder) === BuilderVariant.AI
		? QueryMode.AI_QUERY_BUILDER
		: QueryMode.QUERY_BUILDER;
}

/** Query Builder and AI both author `Query.builder`; the other modes own their own slot. */
export function isBuilderMode(mode: QueryMode): boolean {
	return toBuilderVariant(mode) !== undefined;
}

/** Drops the AI tag, leaving the same query readable as a plain builder query. */
export function withoutAIQueryTag(query: Query): Query {
	if (getBuilderVariant(query.builder) !== BuilderVariant.AI) {
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
