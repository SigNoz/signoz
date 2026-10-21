import {
	BuilderVariant,
	type Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

/** Which variant the `builder` slot holds, whatever query type is active. */
export function getBuilderVariant(builder: Query['builder']): BuilderVariant {
	return builder.queryData[0]?.builderQueryType === EQueryType.AI_QUERY_BUILDER
		? BuilderVariant.AI
		: BuilderVariant.MAIN;
}

/** The variant a tab authors; `undefined` for tabs that own their own slot. */
export function toBuilderVariant(mode: EQueryType): BuilderVariant | undefined {
	if (mode === EQueryType.AI_QUERY_BUILDER) {
		return BuilderVariant.AI;
	}
	return mode === EQueryType.QUERY_BUILDER ? BuilderVariant.MAIN : undefined;
}

/** The tab a query belongs to: its query type, or AI when a builder query carries the tag. */
export function getQueryMode(query: Query): EQueryType {
	if (query.queryType !== EQueryType.QUERY_BUILDER) {
		return query.queryType;
	}
	return getBuilderVariant(query.builder) === BuilderVariant.AI
		? EQueryType.AI_QUERY_BUILDER
		: EQueryType.QUERY_BUILDER;
}

/** Query Builder and AI both author `Query.builder`; the other modes own their own slot. */
export function isBuilderMode(mode: EQueryType): boolean {
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
