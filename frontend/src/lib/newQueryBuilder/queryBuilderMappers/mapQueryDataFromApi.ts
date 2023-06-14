import { initialQueryState } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { transformQueryBuilderDataModel } from '../transformQueryBuilderDataModel';

export const mapQueryDataFromApi = (
	compositeQuery: ICompositeMetricQuery,
): Query => {
	const builder = compositeQuery.builderQueries
		? transformQueryBuilderDataModel(compositeQuery.builderQueries)
		: initialQueryState.builder;

	const promql = compositeQuery.promQueries
		? Object.keys(compositeQuery.promQueries).map((key) => ({
				...compositeQuery.promQueries[key],
				name: key,
		  }))
		: initialQueryState.promql;

	const clickhouseSql = compositeQuery.chQueries
		? Object.keys(compositeQuery.chQueries).map((key) => ({
				...compositeQuery.chQueries[key],
				name: key,
				rawQuery: compositeQuery.chQueries[key].query,
		  }))
		: initialQueryState.clickhouse_sql;

	return {
		builder,
		promql,
		clickhouse_sql: clickhouseSql,
		queryType: compositeQuery.queryType,
	};
};
