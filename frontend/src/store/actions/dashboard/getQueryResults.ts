import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';

export const GetQueryResults = (
	props: GetQueryResultsProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const queryData = props.query;

			const getMaxMinTime = GetMaxMinTime({
				graphType: props.graphType,
				maxTime: props.maxTime,
				minTime: props.minTime,
			});

			const { end, start } = GetStartAndEndTime({
				type: props.selectedTime,
				maxTime: getMaxMinTime.maxTime,
				minTime: getMaxMinTime.minTime,
			});

			const response = await Promise.all(
				queryData
					.filter((e) => e.query)
					.map(async (query) => {
						const result = await getQueryResult({
							end,
							query: encodeURIComponent(query.query),
							start: start,
							step: '30',
						});
						return {
							query: query.query,
							queryData: result,
							legend: query.legend,
						};
					}),
			);

			const isError = response.find(
				({ queryData }) => queryData.statusCode !== 200,
			);

			// want to make sure query is not empty
			const isEmptyQuery =
				queryData.map((e) => e.query).filter((e) => e).length ===
				queryData.map((e) => e.query).length;

			if (isError !== undefined && isEmptyQuery) {
				dispatch({
					type: 'QUERY_ERROR',
					payload: {
						errorMessage: isError.queryData.error || '',
						widgetId: props.widgetId,
					},
				});
			}

			const data = response.map((e) => ({
				query: e.query,
				legend: e.legend || '',
				queryData: e.queryData.payload?.result || [],
			}));

			dispatch({
				type: 'QUERY_SUCCESS',
				payload: {
					widgetId: props.widgetId,
					data,
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
	maxTime: number;
	minTime: number;
	query: Query[];
	graphType: ITEMS;
}
