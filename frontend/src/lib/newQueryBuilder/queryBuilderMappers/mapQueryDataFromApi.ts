import { initialQueryState } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	BuilderQuery,
	ClickHouseQuery,
	PromQuery,
	QueryBuilderFormula,
} from 'types/api/v5/queryRange';
import {
	convertBuilderQueryToIBuilderQuery,
	convertQueryBuilderFormulaToIBuilderFormula,
} from 'utils/convertNewToOldQueryBuilder';
import { v4 as uuid } from 'uuid';

import { transformQueryBuilderDataModel } from '../transformQueryBuilderDataModel';

const mapQueryFromV5 = (
	compositeQuery: ICompositeMetricQuery,
	query?: Query,
): Query => {
	const builderQueries: Record<string, IBuilderQuery | IBuilderFormula> = {};
	const promQueries: IPromQLQuery[] = [];
	const clickhouseQueries: IClickHouseQuery[] = [];

	compositeQuery.queries?.forEach((q) => {
		const spec = q.spec as BuilderQuery | PromQuery | ClickHouseQuery;
		if (q.type === 'builder_query') {
			if (spec.name) {
				builderQueries[spec.name] = convertBuilderQueryToIBuilderQuery(
					spec as BuilderQuery,
				);
			}
		} else if (q.type === 'builder_formula') {
			if (spec.name) {
				builderQueries[spec.name] = convertQueryBuilderFormulaToIBuilderFormula(
					(spec as unknown) as QueryBuilderFormula,
				);
			}
		} else if (q.type === 'promql') {
			const promSpec = spec as PromQuery;
			promQueries.push({
				name: promSpec.name,
				query: promSpec.query || '',
				legend: promSpec.legend || '',
				disabled: promSpec.disabled || false,
			});
		} else if (q.type === 'clickhouse_sql') {
			const chSpec = spec as ClickHouseQuery;
			clickhouseQueries.push({
				name: chSpec.name,
				query: chSpec.query,
				legend: chSpec.legend || '',
				disabled: chSpec.disabled || false,
			});
		}
	});
	return {
		builder: transformQueryBuilderDataModel(builderQueries, query?.builder),
		promql: promQueries,
		clickhouse_sql: clickhouseQueries,
		queryType: compositeQuery.queryType,
		id: uuid(),
		unit: compositeQuery.unit,
	};
};

const mapQueryFromV3 = (
	compositeQuery: ICompositeMetricQuery,
	query?: Query,
): Query => {
	const builder = compositeQuery.builderQueries
		? transformQueryBuilderDataModel(
				compositeQuery.builderQueries,
				query?.builder,
		  )
		: initialQueryState.builder;

	const promql = compositeQuery.promQueries
		? Object.keys(compositeQuery.promQueries).map((key) => ({
				...compositeQuery.promQueries?.[key],
				name: key,
		  }))
		: initialQueryState.promql;

	const clickhouseSql = compositeQuery.chQueries
		? Object.keys(compositeQuery.chQueries).map((key) => ({
				...compositeQuery.chQueries?.[key],
				name: key,
				query: compositeQuery.chQueries?.[key]?.query || '',
		  }))
		: initialQueryState.clickhouse_sql;

	return {
		builder,
		promql: promql as IPromQLQuery[],
		clickhouse_sql: clickhouseSql as IClickHouseQuery[],
		queryType: compositeQuery.queryType,
		id: uuid(),
		unit: compositeQuery.unit,
	};
};

export const mapQueryDataFromApi = (
	compositeQuery: ICompositeMetricQuery,
	query?: Query,
): Query => {
	if (compositeQuery.queries && compositeQuery.queries.length > 0) {
		return mapQueryFromV5(compositeQuery, query);
	}
	return mapQueryFromV3(compositeQuery, query);
};
