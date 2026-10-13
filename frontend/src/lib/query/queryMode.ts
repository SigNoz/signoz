import {
	BuilderVariant,
	type Query,
	QueryMode,
} from 'types/api/queryBuilder/queryBuilderData';

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
