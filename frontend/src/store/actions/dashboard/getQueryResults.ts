import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { AxiosError } from 'axios';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME } from 'container/NewWidget/LeftContainer/QuerySection/constants';
import { EQueryTypeToQueryKeyMapping } from 'container/NewWidget/LeftContainer/QuerySection/types';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetMinMax from 'lib/getMinMax';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import getStep from 'lib/getStep';
import { isEmpty } from 'lodash-es';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';
import {
	EDataSource,
	EPanelType,
	EQueryType,
	EReduceOperator,
} from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

export const GetMetricQueryRange = async ({
	query,
	globalSelectedInterval,
	graphType,
	selectedTime,
}) => {
	const { queryType } = query;
	const queryKey = EQueryTypeToQueryKeyMapping[EQueryType[query.queryType]];
	const queryData = query[queryKey];
	const legendMap = {};
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
				const generatedQueryPayload = {};
				generatedQueryPayload.queryName = query.name;
				generatedQueryPayload.aggregateOperator = query.aggregateOperator;
				generatedQueryPayload.metricName = query.metricName;
				generatedQueryPayload.tagFilters = query.tagFilters;

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
				generatedFormulaPayload.queryName = formula.name;
				generatedFormulaPayload.expression = formula.expression;
				generatedFormulaPayload.disabled = formula.disabled;
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

	// const generatedQueryPayload = {};
	// props.query.map((query) => {
	// 	generatedQueryPayload[query.name] = query;
	// 	query['rawQuery'] = query.clickHouseQuery;
	// });
	// console.log({ generatedQueryPayload });
	// debugger;

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
		start: parseInt(start * 1000),
		end: parseInt(end * 1000),
		step: getStep({ start, end, inputFormat: 'ms' }),
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
				queryData.legend = legendMap[queryData.queryName];
				if (isEmpty(queryData.metric)) {
					queryData.metric[queryData.queryName] = queryData.queryName;
					queryData.legend = queryData.queryName;
				}
				return queryData;
			},
		);
	}
	return response;
};

export const GetQueryResults = (
	props: GetQueryResultsProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const response = await GetMetricQueryRange(props);

			// debugger;
			// await Promise.all(
			// 	queryData
			// 		.filter((e) => e.query)
			// 		.map(async (query) => {
			// 			const result = await getQueryResult({
			// 				end,
			// 				query: encodeURIComponent(query.query),
			// 				start,
			// 				step: `${getStep({ start, end, inputFormat: 'ms' })}`,
			// 			});
			// 			return {
			// 				query: query.query,
			// 				queryData: result,
			// 				legend: query.legend,
			// 			};
			// 		}),
			// );

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

			// const data = response.map((e) => ({
			// 	query: e.query,
			// 	legend: e.legend || '',
			// 	queryData: e.queryData.payload?.result || [],
			// }));

			dispatch({
				type: 'QUERY_SUCCESS',
				payload: {
					widgetId: props.widgetId,
					data: {
						query: 'Q1',
						legend: '',
						queryData: response.payload?.data?.result
							? response.payload?.data?.result
							: [],
					},
				},
			});
			dispatch({
				type: 'QUERY_ERROR',
				payload: {
					errorMessage: '',
					widgetId: props.widgetId,
					errorBoolean: false,
				},
			});
		} catch (error) {
			dispatch({
				type: 'QUERY_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString(),
					widgetId: props.widgetId,
				},
			});
		}
	};
};

export interface GetQueryResultsProps {
	widgetId: string;
	selectedTime: timePreferenceType;
	query: Query[];
	graphType: ITEMS;
	globalSelectedInterval: GlobalReducer['selectedTime'];
}
