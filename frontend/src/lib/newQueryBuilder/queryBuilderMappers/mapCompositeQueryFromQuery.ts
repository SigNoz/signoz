/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import {
	IClickHouseQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { mapQueryDataToApi } from './mapQueryDataToApi';

export const mapCompositeQueryFromQuery = (
	query: Query,
	panelType: PANEL_TYPES | null,
): ICompositeMetricQuery => {
	const queryData = query[query.queryType];
	const QueryPayload: {
		compositeQuery: ICompositeMetricQuery;
	} = {
		compositeQuery: {
			queryType: query.queryType,
			panelType: panelType || PANEL_TYPES.TIME_SERIES,
			builderQueries: {},
			chQueries: {},
			promQueries: {},
		},
	};

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas } = query.builder;
			const currentQueryData = mapQueryDataToApi(data, 'queryName');
			const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

			const builderQueries = {
				...currentQueryData.data,
				...currentFormulas.data,
			};

			QueryPayload.compositeQuery.builderQueries = builderQueries;
			break;
		}
		case EQueryType.CLICKHOUSE: {
			const chQueries: IClickHouseQuery = {
				name: '',
				legend: '',
				disabled: false,
				query: '',
			};
			queryData.map((query: IClickHouseQuery) => {
				if (!query.query) return;
				chQueries[query.name] = {
					query: query.query,
					disabled: query.disabled,
				};
			});
			QueryPayload.compositeQuery.chQueries = chQueries;
			break;
		}
		case EQueryType.PROM: {
			const promQueries = {};
			queryData.map((query) => {
				if (!query.query) return;
				promQueries[query.name] = {
					query: query.query,
					disabled: query.disabled,
				};
			});
			QueryPayload.compositeQuery.promQueries = promQueries;
			break;
		}
		default:
			break;
	}

	return QueryPayload.compositeQuery;
};
