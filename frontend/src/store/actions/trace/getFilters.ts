import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getFiltersApi from 'api/trace/getFilters';
import {
	parseSelectedFilter,
	parseFilterToFetchData,
	parseQueryIntoCurrent,
} from './util';
import {
	UPDATE_ALL_FILTERS,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import isEqual from 'lodash-es/isEqual';
import { TraceFilterEnum } from 'types/reducer/trace';
import { notification } from 'antd';

export const GetFilter = (
	query: string,
	minTime: GlobalReducer['minTime'],
	maxTime: GlobalReducer['maxTime'],
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const { traces, globalTime } = getState();

			const getSelectedFilter = parseSelectedFilter(query, traces.selectedFilter);
			const getFilterToFetchData = parseFilterToFetchData(
				query,
				traces.filterToFetchData,
			);
			const parsedQueryCurrent = parseQueryIntoCurrent(
				query,
				traces.spansAggregate.currentPage,
			);

			// if (
			// 	!(
			// 		isEqual(getSelectedFilter.currentValue, getSelectedFilter.urlValue) &&
			// 		isEqual(
			// 			getFilterToFetchData.currentValue,
			// 			getFilterToFetchData.urlValue,
			// 		) &&
			// 		isEqual(parsedQueryCurrent.currentValue, parsedQueryCurrent.urlValue)
			// 	)
			// ) {
			// 	console.log('filter is equal');
			// 	return;
			// }

			// if (
			// 	!isAllowedToUpdateTheState(query, traces, {
			// 		maxTime: globalTime.maxTime,
			// 		minTime: globalTime.minTime,
			// 	})
			// ) {
			// 	return;
			// }
			// get the reducer or url based initital value

			// now filter are not matching we need to fetch the data and make in sync
			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: true,
				},
			});

			const response = await getFiltersApi({
				end: String(maxTime),
				getFilters: getFilterToFetchData.currentValue,
				start: String(minTime),
				other: Object.fromEntries(getSelectedFilter.currentValue),
			});

			if (response.statusCode === 200) {
				const initialFilter = new Map<TraceFilterEnum, Record<string, string>>();

				Object.keys(response.payload).forEach((key) => {
					const value = response.payload[key];
					initialFilter.set(key as TraceFilterEnum, value);
				});

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						filter: initialFilter,
						selectedFilter: getSelectedFilter.currentValue,
						filterToFetchData: getFilterToFetchData.currentValue,
						current: parsedQueryCurrent.currentValue,
					},
				});
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}

			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: false,
				},
			});
		} catch (error) {
			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: false,
				},
			});
		}
	};
};
