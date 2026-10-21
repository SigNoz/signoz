import type {
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import type { QueryBuilderData } from 'types/common/queryBuilder';

export type BuilderSlotKey = 'builder' | 'builder_ai_query';

const EMPTY_BUILDER: QueryBuilderData = {
	queryData: [],
	queryFormulas: [],
	queryTraceOperator: [],
};

/** Query Builder and AI Query Builder; both author builder queries, each in its own slot. */
export function isBuilderQueryType(queryType: EQueryType | undefined): boolean {
	return (
		queryType === EQueryType.QUERY_BUILDER ||
		queryType === EQueryType.AI_QUERY_BUILDER
	);
}

/** The `Query` slot builder edits land in; non-builder types keep `builder`, as they always have. */
export function getBuilderSlotKey(queryType: EQueryType): BuilderSlotKey {
	return queryType === EQueryType.AI_QUERY_BUILDER
		? 'builder_ai_query'
		: 'builder';
}

/**
 * The query as the backend takes it. AI goes out as a `builder` query whose queries carry
 * `builderQueryType: builder_ai_query`, the tag set from the slot so a stale one can't leak.
 */
export function toWireQuery(query: Query): Query {
	if (query.queryType !== EQueryType.AI_QUERY_BUILDER) {
		return query;
	}
	const aiBuilder = getActiveBuilder(query);
	return {
		...query,
		queryType: EQueryType.QUERY_BUILDER,
		builder: {
			...aiBuilder,
			queryData: aiBuilder.queryData.map((queryData) => ({
				...queryData,
				builderQueryType: 'builder_ai_query',
			})),
		},
	};
}

/** The builder at `slot`; an unused AI slot holds none. */
export function getBuilderAt(
	state: QueryState,
	slot: BuilderSlotKey,
): QueryBuilderData {
	return state[slot] ?? EMPTY_BUILDER;
}

/** `state` with the builder at `slot` replaced. */
export function withBuilderAt<T extends QueryState>(
	state: T,
	slot: BuilderSlotKey,
	builder: QueryBuilderData,
): T {
	return { ...state, [slot]: builder };
}

/** The builder queries `queryType` authors; an unused AI slot holds none. */
export function getActiveBuilder(query: Query): QueryBuilderData {
	return getBuilderAt(query, getBuilderSlotKey(query.queryType));
}
