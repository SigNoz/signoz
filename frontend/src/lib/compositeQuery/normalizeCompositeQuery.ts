import { initialQueryState } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

/**
 * Fills a partial composite query with defaults from initialQueryState and
 * stamps a fresh id. This is the normalization applied before a query is
 * committed (staged) — extracted from redirectWithQueryBuilderData.
 */
export const normalizeCompositeQuery = (query: Partial<Query>): Query => {
	const queryType =
		!query.queryType || !Object.values(EQueryType).includes(query.queryType)
			? EQueryType.QUERY_BUILDER
			: query.queryType;

	const builder =
		!query.builder || query.builder.queryData?.length === 0
			? initialQueryState.builder
			: query.builder;

	const promql =
		!query.promql || query.promql.length === 0
			? initialQueryState.promql
			: query.promql;

	const clickhouseSql =
		!query.clickhouse_sql || query.clickhouse_sql.length === 0
			? initialQueryState.clickhouse_sql
			: query.clickhouse_sql;

	return {
		queryType,
		builder,
		promql,
		clickhouse_sql: clickhouseSql,
		id: uuid(),
		unit: query.unit || initialQueryState.unit,
	};
};
