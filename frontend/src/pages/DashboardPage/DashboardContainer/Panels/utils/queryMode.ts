import { initialQueryAIWithType } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { AI_QUERY_MODE, type PanelQueryMode } from '../types/queryModes';

/**
 * The mode a query is authored in. The AI mode has no `queryType` of its own — it is a
 * builder query tagged per-query — so it is read off the queries rather than off the
 * envelope around them.
 */
export function getQueryMode(query: Query): PanelQueryMode {
	if (
		query.queryType === EQueryType.QUERY_BUILDER &&
		(query.builder?.queryData ?? []).some(
			(q) => q.builderQueryType === AI_QUERY_MODE,
		)
	) {
		return AI_QUERY_MODE;
	}
	return query.queryType;
}

/**
 * Retargets a query at `mode`, which is the only safe way to change it: the AI tag lives on
 * every query and has to be stamped or cleared in step with `queryType`, or the tab and the
 * queries disagree.
 *
 * Entering the AI mode keeps queries that are already traces (the common case — the user was
 * building a trace query and wants AI's field set); anything else is replaced with a fresh AI
 * query rather than coerced, which would leave metric aggregations on a traces query.
 */
export function withQueryMode(query: Query, mode: PanelQueryMode): Query {
	if (mode === AI_QUERY_MODE) {
		const queryData = query.builder?.queryData ?? [];
		const isAllTraces =
			queryData.length > 0 &&
			queryData.every((q) => q.dataSource === DataSource.TRACES);
		return {
			...query,
			queryType: EQueryType.QUERY_BUILDER,
			builder: isAllTraces
				? {
						...query.builder,
						queryData: queryData.map((q) => ({
							...q,
							builderQueryType: AI_QUERY_MODE,
						})),
					}
				: initialQueryAIWithType.builder,
		};
	}
	return {
		...query,
		queryType: mode,
		builder: {
			...query.builder,
			queryData: (query.builder?.queryData ?? []).map((q) => ({
				...q,
				builderQueryType: undefined,
			})),
		},
	};
}
