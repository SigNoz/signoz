import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { QueryMode } from 'types/common/dashboard';

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
