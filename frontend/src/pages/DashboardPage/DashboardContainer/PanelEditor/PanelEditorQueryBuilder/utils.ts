import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

/**
 * Tab key for the AI query builder. Deliberately not an `EQueryType`: an AI query is
 * a builder query carrying `builderQueryType: 'builder_ai_query'`, so the query type
 * on the wire stays `builder` and only the per-query envelope tag differs. Keeping the
 * tab out of the enum leaves that tag the single source of truth.
 */
export const AI_QUERY_TAB = 'ai_builder' as const;

export type QueryTabKey = EQueryType | typeof AI_QUERY_TAB;

export function isAIQuery(query: Query): boolean {
	return query.builder.queryData.some(
		(item) => item.builderQueryType === 'builder_ai_query',
	);
}

/** The tab to highlight — derived from the queries, never stored separately. */
export function resolveActiveQueryTab(query: Query): QueryTabKey {
	return query.queryType === EQueryType.QUERY_BUILDER && isAIQuery(query)
		? AI_QUERY_TAB
		: query.queryType;
}

/** Carried across a signal switch, mirroring the builder's own datasource selector. */
const PRESERVED_ON_SIGNAL_SWITCH = ['queryName', 'expression'];

/**
 * Re-seed a non-traces query with the traces defaults, the way `handleChangeDataSource`
 * does. AI queries are traces-only, and a leftover metrics aggregation carries
 * `metricName` — a field the backend rejects on a trace spec. A query already on traces
 * keeps its filters, so switching tabs on a trace query is non-destructive.
 */
function toTracesQueryData(item: IBuilderQuery): IBuilderQuery {
	if (item.dataSource === DataSource.TRACES) {
		return item;
	}

	const tracesDefaults = Object.fromEntries(
		Object.entries(initialQueryBuilderFormValuesMap[DataSource.TRACES]).filter(
			([key]) => !PRESERVED_ON_SIGNAL_SWITCH.includes(key),
		),
	);
	return { ...item, ...tracesDefaults, dataSource: DataSource.TRACES };
}

/** Move a query onto the AI builder: pin every query to traces and tag it. */
export function toAIQuery(query: Query): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((item) => ({
				...toTracesQueryData(item),
				builderQueryType: 'builder_ai_query' as const,
			})),
		},
	};
}

/**
 * Stamp or clear `builderQueryType` across every builder query. Returns the query
 * untouched when it already matches, and deletes the key rather than setting it to
 * `undefined` — the dirty checks compare by value, so a stray key reads as an edit.
 */
export function withAIQueryType(query: Query, enabled: boolean): Query {
	const needsUpdate = query.builder.queryData.some(
		(item) => (item.builderQueryType === 'builder_ai_query') !== enabled,
	);
	if (!needsUpdate) {
		return query;
	}

	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((item): IBuilderQuery => {
				const { builderQueryType: _dropped, ...rest } = item;
				return enabled ? { ...rest, builderQueryType: 'builder_ai_query' } : rest;
			}),
		},
	};
}
