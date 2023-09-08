import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import {
	BuilderClickHouseResource,
	BuilderPromQLResource,
	IClickHouseQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { mapQueryDataToApi } from './mapQueryDataToApi';

const defaultCompositeQuery: ICompositeMetricQuery = {
	queryType: EQueryType.QUERY_BUILDER,
	panelType: PANEL_TYPES.TIME_SERIES,
	builderQueries: {},
	chQueries: {},
	promQueries: {},
	unit: undefined,
};

const buildBuilderQuery = (
	query: Query,
	panelType: PANEL_TYPES | null,
): ICompositeMetricQuery => {
	const { queryData, queryFormulas } = query.builder;
	const currentQueryData = mapQueryDataToApi(queryData, 'queryName');
	const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');
	const builderQueries = {
		...currentQueryData.data,
		...currentFormulas.data,
	};

	const compositeQuery = defaultCompositeQuery;
	compositeQuery.queryType = query.queryType;
	compositeQuery.panelType = panelType || PANEL_TYPES.TIME_SERIES;
	compositeQuery.builderQueries = builderQueries;

	return compositeQuery;
};

const buildClickHouseQuery = (
	query: Query,
	panelType: PANEL_TYPES | null,
): ICompositeMetricQuery => {
	const chQueries: BuilderClickHouseResource = {};
	query.clickhouse_sql.forEach((query: IClickHouseQuery) => {
		if (!query.query) return;
		chQueries[query.name] = query;
	});

	const compositeQuery = defaultCompositeQuery;
	compositeQuery.queryType = query.queryType;
	compositeQuery.panelType = panelType || PANEL_TYPES.TIME_SERIES;
	compositeQuery.chQueries = chQueries;

	return compositeQuery;
};

const buildPromQuery = (
	query: Query,
	panelType: PANEL_TYPES | null,
): ICompositeMetricQuery => {
	const promQueries: BuilderPromQLResource = {};
	query.promql.forEach((query) => {
		if (!query.query) return;
		promQueries[query.name] = {
			legend: query.legend,
			name: query.name,
			query: query.query,
			disabled: query.disabled,
		};
	});

	const compositeQuery = defaultCompositeQuery;
	compositeQuery.queryType = query.queryType;
	compositeQuery.panelType = panelType || PANEL_TYPES.TIME_SERIES;
	compositeQuery.promQueries = promQueries;

	return compositeQuery;
};

const queryTypeMethodMapping = {
	[EQueryType.QUERY_BUILDER]: buildBuilderQuery,
	[EQueryType.CLICKHOUSE]: buildClickHouseQuery,
	[EQueryType.PROM]: buildPromQuery,
};

export const mapCompositeQueryFromQuery = (
	query: Query,
	panelType: PANEL_TYPES | null,
): ICompositeMetricQuery => {
	if (query.queryType in queryTypeMethodMapping) {
		const functionToBuildQuery = queryTypeMethodMapping[query.queryType];

		if (functionToBuildQuery && typeof functionToBuildQuery === 'function') {
			return functionToBuildQuery(query, panelType);
		}
	}

	return {
		queryType: query.queryType,
		panelType: panelType || PANEL_TYPES.TIME_SERIES,
		builderQueries: {},
		chQueries: {},
		promQueries: {},
		unit: undefined,
	};
};
