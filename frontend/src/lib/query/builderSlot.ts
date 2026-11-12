import { Querybuildertypesv5QueryTypeDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import type { QueryBuilderData } from 'types/common/queryBuilder';

export type BuilderSlotKey =
	| EQueryType.QUERY_BUILDER
	| EQueryType.AI_QUERY_BUILDER;

const EMPTY_BUILDER: QueryBuilderData = {
	queryData: [],
	queryFormulas: [],
	queryTraceOperator: [],
};

/** Query Builder and AI Query Builder; both author builder queries, each in its own slot. */
export function isBuilderQueryType(queryType: EQueryType): boolean {
	return (
		queryType === EQueryType.QUERY_BUILDER ||
		queryType === EQueryType.AI_QUERY_BUILDER
	);
}

export function isAIQueryType(queryType: EQueryType): boolean {
	return queryType === EQueryType.AI_QUERY_BUILDER;
}

/** The `Query` slot builder edits land in; non-builder types keep `builder`, as they always have. */
export function getBuilderSlotKeyForQueryType(
	queryType: EQueryType,
): BuilderSlotKey {
	return isAIQueryType(queryType)
		? EQueryType.AI_QUERY_BUILDER
		: EQueryType.QUERY_BUILDER;
}

/**
 * The query as the backend takes it. AI goes out as a `builder` query whose queries carry
 * `builderQueryType: builder_ai_query`, the tag set from the slot so a stale one can't leak.
 */
export function toRequestQuery(query: Query): Query {
	if (!isAIQueryType(query.queryType)) {
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
				builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
			})),
		},
	};
}

/** Undoes `toRequestQuery` for `slotQuery`: builder edits made on the request shape land back in its slot. */
export function toSlotQuery(requestQuery: Query, slotQuery: Query): Query {
	if (!isAIQueryType(slotQuery.queryType)) {
		return requestQuery;
	}
	return {
		...requestQuery,
		queryType: slotQuery.queryType,
		builder: slotQuery.builder,
		builder_ai_query: requestQuery.builder,
	};
}

/** The builder at `slotKey`; an unused AI slot holds none. */
export function getBuilderBySlotKey(
	state: QueryState,
	slotKey: BuilderSlotKey,
): QueryBuilderData {
	return state[slotKey] ?? EMPTY_BUILDER;
}

/** `state` with the builder at `slotKey` replaced. */
export function replaceBuilderBySlotKey<T extends QueryState>(
	state: T,
	slotKey: BuilderSlotKey,
	builder: QueryBuilderData,
): T {
	return { ...state, [slotKey]: builder };
}

/** The builder queries `queryType` authors; an unused AI slot holds none. */
export function getActiveBuilder(query: Query): QueryBuilderData {
	return getBuilderBySlotKey(
		query,
		getBuilderSlotKeyForQueryType(query.queryType),
	);
}
