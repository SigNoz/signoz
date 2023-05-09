/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { AxiosError } from 'axios';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetMinMax from 'lib/getMinMax';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import getStep from 'lib/getStep';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEmpty } from 'lodash-es';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Query } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { convertNewDataToOld } from 'lib/newQueryBuilder/convertNewDataToOld';

export async function GetMetricQueryRange({
	query,
	globalSelectedInterval,
	graphType,
	selectedTime,
	variables = {},
}: {
	query: Query;
	graphType: GRAPH_TYPES;
	selectedTime: timePreferenceType;
	globalSelectedInterval: Time;
	variables?: Record<string, unknown>;
}): Promise<SuccessResponse<MetricRangePayloadProps> | ErrorResponse> {
	const queryData = query[query.queryType];
	let legendMap: Record<string, string> = {};

	const QueryPayload = {
		compositeQuery: {
			queryType: query.queryType,
			panelType: graphType,
		},
	};

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas } = query.builder;
			const builderQueries = mapQueryDataToApi({
				queryData: data,
				queryFormulas,
			});
			legendMap = builderQueries.newLegendMap;

			QueryPayload.compositeQuery.builderQueries = builderQueries.data;
			break;
		}
		case EQueryType.CLICKHOUSE: {
			const chQueries = {};
			queryData.map((query) => {
				if (!query.rawQuery) return;
				chQueries[query.name] = {
					query: query.rawQuery,
					disabled: query.disabled,
				};
				legendMap[query.name] = query.legend;
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
				legendMap[query.name] = query.legend;
			});
			QueryPayload.compositeQuery.promQueries = promQueries;
			break;
		}
		default:
			return;
	}

	const { globalTime } = store.getState();

	const minMax = GetMinMax(globalSelectedInterval, [
		globalTime.minTime / 1000000,
		globalTime.maxTime / 1000000,
	]);

	const getMaxMinTime = GetMaxMinTime({
		graphType: null,
		maxTime: minMax.maxTime,
		minTime: minMax.minTime,
	});

	const { end, start } = GetStartAndEndTime({
		type: selectedTime,
		maxTime: getMaxMinTime.maxTime,
		minTime: getMaxMinTime.minTime,
	});
	const response = await getMetricsQueryRange({
		start: parseInt(start, 10) * 1e3,
		end: parseInt(end, 10) * 1e3,
		step: getStep({ start, end, inputFormat: 'ms' }),
		variables,
		...QueryPayload,
	});
	if (response.statusCode >= 400) {
		throw new Error(
			`API responded with ${response.statusCode} -  ${response.error}`,
		);
	}

	if (response.payload?.data?.result) {
		const v2Range = convertNewDataToOld(response.payload);

		response.payload = v2Range;

		response.payload.data.result = response.payload.data.result.map(
			(queryData) => {
				const newQueryData = queryData;
				newQueryData.legend = legendMap[queryData.queryName]; // Adds the legend if it is already defined by the user.
				// If metric names is an empty object
				if (isEmpty(queryData.metric)) {
					// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
					if (!newQueryData.legend) {
						newQueryData.legend = queryData.queryName;
					}
					// If name of the query and the legend if inserted is same then add the same to the metrics object.
					if (queryData.queryName === newQueryData.legend) {
						newQueryData.metric[queryData.queryName] = queryData.queryName;
					}
				}

				return newQueryData;
			},
		);
	}
	return response;
}

export const GetQueryResults = (
	props: GetQueryResultsProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'QUERY_ERROR',
				payload: {
					errorMessage: '',
					widgetId: props.widgetId,
					errorBoolean: false,
					isLoadingQueryResult: true,
				},
			});
			const response = await GetMetricQueryRange(props);

			const isError = response.error;

			if (isError != null) {
				dispatch({
					type: 'QUERY_ERROR',
					payload: {
						errorMessage: isError || '',
						widgetId: props.widgetId,
						isLoadingQueryResult: false,
					},
				});
				return;
			}

			dispatch({
				type: 'QUERY_SUCCESS',
				payload: {
					widgetId: props.widgetId,
					data: {
						queryData: response.payload?.data?.result
							? response.payload?.data?.result
							: [],
					},
				},
			});
		} catch (error) {
			dispatch({
				type: 'QUERY_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString(),
					widgetId: props.widgetId,
					errorBoolean: true,
					isLoadingQueryResult: false,
				},
			});
		}
	};
};

export interface GetQueryResultsProps {
	widgetId: string;
	selectedTime: timePreferenceType;
	query: Query;
	graphType: ITEMS;
	globalSelectedInterval: GlobalReducer['selectedTime'];
	variables: Record<string, unknown>;
}
