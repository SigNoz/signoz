import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

export const GetQueryResult = (
	props: GetQueryResultProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const state = store.getState();
			const dashboards = state.dashboards.dashboards;
			const [selectedDashboard] = dashboards;
			const { data } = selectedDashboard;
			const { widgets = [] } = data;
			const selectedWidgetIndex = widgets.findIndex(
				(e) => e.id === props.widgetId,
			);
			const selectedWidget = widgets[selectedWidgetIndex];
			const { query } = selectedWidget;
			const preQuery = query.slice(0, props.currentIndex);
			const afterQuery = query.slice(props.currentIndex + 1, query.length);
			const queryArray: Query['query'][] = [
				...preQuery,
				{
					query: props.query,
					legend: props.legend,
				},
				...afterQuery,
			].map((e) => e.query);
			const { end, start } = getStartAndEndTime({
				type: props.selectedTime,
			});
			const response = await Promise.all(
				queryArray.map(async (query) => {
					const result = await getQueryResult({
						end,
						query,
						start: start,
						step: '30',
					});
					return result;
				}),
			);
			const isError = response.find((e) => e.statusCode !== 200);

			if (isError !== undefined) {
				dispatch({
					type: 'QUERY_ERROR',
					payload: {
						errorMessage: isError.error || '',
						widgetId: props.widgetId,
					},
				});
			} else {
				const intialQuery: QueryData[] = [];

				const finalQueryData: QueryData[] = response.reduce((acc, current) => {
					return [...acc, ...(current.payload?.result || [])];
				}, intialQuery);

				dispatch({
					type: 'QUERY_SUCCESS',
					payload: {
						legend: props.legend,
						query: props.query,
						widgetId: props.widgetId,
						queryData: finalQueryData,
						queryIndex: props.currentIndex,
					},
				});
			}
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

export interface GetQueryResultProps {
	currentIndex: number;
	legend: string;
	query: string;
	widgetId: string;
	selectedTime: timePreferenceType;
}
