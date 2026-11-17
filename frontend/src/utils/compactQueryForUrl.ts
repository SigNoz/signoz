import { initialQueryState } from 'constants/queryBuilder';
import { isEqual, isPlainObject } from 'lodash-es';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

type UrlQuery = Omit<Partial<Query>, 'builder'> & {
	builder?: Partial<Query['builder']>;
};

export function compactQueryForUrl(query: UrlQuery): UrlQuery {
	const compact = { ...query };

	if (isEqual(compact.promql, initialQueryState.promql)) {
		delete compact.promql;
	}
	if (isEqual(compact.clickhouse_sql, initialQueryState.clickhouse_sql)) {
		delete compact.clickhouse_sql;
	}

	if (isPlainObject(compact.builder)) {
		compact.builder = { ...compact.builder };
		if (isEqual(compact.builder.queryFormulas, [])) {
			delete compact.builder.queryFormulas;
		}
		if (isEqual(compact.builder.queryTraceOperator, [])) {
			delete compact.builder.queryTraceOperator;
		}
	}

	return compact;
}
