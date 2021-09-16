import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { Query } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

export const GetQueryResults = (
	props: GetQueryResultsProps,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const queryData = props.query;

			const { end, start } = GetStartAndEndTime({
				type: props.selectedTime,
				maxTime: props.maxTime,
				minTime: props.minTime,
			});

			const response = await Promise.all(
				queryData
					.filter((e) => e.query)
					.map(async (query) => {
						const result = await getQueryResult({
							end,
							query: query.query,
							start: start,
							step: '30',
						});
						return result;
					}),
			);

			const isError = response.find((e) => e.statusCode !== 200);

			// want to make sure query is not empty
			const isEmptyQuery =
				queryData.map((e) => e.query).filter((e) => e).length ===
				queryData.map((e) => e.query).length;

			if (isError !== undefined && isEmptyQuery) {
				dispatch({
					type: 'QUERY_ERROR',
					payload: {
						errorMessage: isError.error || '',
						widgetId: props.widgetId,
					},
				});
			}

			const intialQuery: QueryData[] = [];

			const finalQueryData: QueryData[] = response.reduce((acc, current) => {
				return [...acc, ...(current.payload?.result || [])];
			}, intialQuery);

			dispatch({
				type: 'QUERY_SUCCESS',
				payload: {
					widgetId: props.widgetId,
					queryData: finalQueryData,
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
}
