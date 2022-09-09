/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { AxiosError } from 'axios';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME } from 'container/NewWidget/LeftContainer/QuerySection/constants';
import { EQueryTypeToQueryKeyMapping } from 'container/NewWidget/LeftContainer/QuerySection/types';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetMinMax from 'lib/getMinMax';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import getStep from 'lib/getStep';
import { isEmpty } from 'lodash-es';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IDashboardVariable, Query } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { EDataSource, EPanelType, EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

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
	const { queryType } = query;
	const queryKey: Record<EQueryTypeToQueryKeyMapping, string> =
		EQueryTypeToQueryKeyMapping[EQueryType[query.queryType]];
	const queryData = query[queryKey];
	const legendMap: Record<string, string> = {};

	const QueryPayload = {
		dataSource: EDataSource.METRICS,
		compositeMetricQuery: {
			queryType,
			panelType: EPanelType[graphType],
		},
	};
	switch (queryType as EQueryType) {
		case EQueryType.QUERY_BUILDER: {
			const builderQueries = {};
			queryData.queryBuilder.map((query) => {
				const generatedQueryPayload = {
					queryName: query.name,
					aggregateOperator: query.aggregateOperator,
					metricName: query.metricName,
					tagFilters: query.tagFilters,
				};

				if (graphType === 'TIME_SERIES') {
					generatedQueryPayload.groupBy = query.groupBy;
				}

				// Value
				else {
					generatedQueryPayload.reduceTo = query.reduceTo;
				}

				generatedQueryPayload.expression = query.name;
				generatedQueryPayload.disabled = query.disabled;
				builderQueries[query.name] = generatedQueryPayload;
				legendMap[query.name] = query.legend || '';
			});

			queryData[WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME].map((formula) => {
				const generatedFormulaPayload = {};
				legendMap[formula.name] = formula.legend || formula.name;
				generatedFormulaPayload.queryName = formula.name;
				generatedFormulaPayload.expression = formula.expression;
				generatedFormulaPayload.disabled = formula.disabled;
				generatedFormulaPayload.legend = formula.legend;
				builderQueries[formula.name] = generatedFormulaPayload;
			});
			QueryPayload.compositeMetricQuery.builderQueries = builderQueries;
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
			QueryPayload.compositeMetricQuery.chQueries = chQueries;
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
			QueryPayload.compositeMetricQuery.promQueries = promQueries;
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
