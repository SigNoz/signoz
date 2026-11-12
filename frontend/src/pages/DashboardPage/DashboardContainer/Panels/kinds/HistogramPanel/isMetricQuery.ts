import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

/** PromQL and ClickHouse read metrics here; a builder query does when any of it does. */
export function isMetricQuery(query: Query): boolean {
	if (query.queryType !== EQueryType.QUERY_BUILDER) {
		return true;
	}
	return query.builder.queryData.some(
		(queryData) => queryData.dataSource === DataSource.METRICS,
	);
}
