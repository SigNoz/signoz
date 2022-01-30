import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getFiltersApi from 'api/trace/getFilters';
import {
	parseSelectedFilter,
	parseFilterToFetchData,
	parseQueryIntoCurrent,
	parseQueryIntoSelectedTags,
	isTraceFilterEnum,
} from './util';
import {
	UPDATE_ALL_FILTERS,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import { TraceFilterEnum } from 'types/reducer/trace';
import { notification } from 'antd';
import xor from 'lodash-es/xor';

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

			if (globalTime.maxTime !== maxTime && globalTime.minTime !== minTime) {
				return;
			}

			const getSelectedFilter = parseSelectedFilter(query, traces.selectedFilter);
			const getFilterToFetchData = parseFilterToFetchData(
				query,
				traces.filterToFetchData,
			);

			const parsedQueryCurrent = parseQueryIntoCurrent(
				query,
				traces.spansAggregate.currentPage,
			);

			const parsedSelectedTags = parseQueryIntoSelectedTags(
				query,
				traces.selectedTags,
			);

			// now filter are not matching we need to fetch the data and make in sync
			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: true,
				},
			});

			const allFilterResponse = await getFiltersApi({
				end: String(maxTime),
				getFilters: getFilterToFetchData.currentValue,
				start: String(minTime),
				other: {},
			});

			let preSelectedFilter: Map<TraceFilterEnum, string[]> = new Map(
				getSelectedFilter.currentValue,
			);

			// update the selected Filter
			if (allFilterResponse.payload) {
				const diff = traces.preSelectedFilter
					? traces.filterToFetchData
					: xor(traces.filterToFetchData, getFilterToFetchData.currentValue);

				Object.keys(allFilterResponse.payload).map((key) => {
					const value = allFilterResponse.payload[key];
					Object.keys(value)
						// remove maxDuration and minDuration filter from initial selection logic
						.filter((e) => !['maxDuration', 'minDuration'].includes(e))
						.map((preKey) => {
							if (isTraceFilterEnum(key) && diff.find((v) => v === key)) {
								const preValue = preSelectedFilter?.get(key) || [];
								preSelectedFilter?.set(key, [...preValue, preKey]);
							}
						});
				});
			}

			const response = await getFiltersApi({
				end: String(maxTime),
				getFilters: getFilterToFetchData.currentValue,
				start: String(minTime),
				other: Object.fromEntries(
					traces.preSelectedFilter ? [] : preSelectedFilter,
				),
			});

			if (response.statusCode === 200 && allFilterResponse.statusCode === 200) {
				const initialFilter = new Map<TraceFilterEnum, Record<string, string>>();

				Object.keys(allFilterResponse.payload).forEach((key) => {
					const value = allFilterResponse.payload[key];
					if (isTraceFilterEnum(key)) {
						initialFilter.set(key as TraceFilterEnum, value);
					}
				});

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						filter: initialFilter,
						selectedFilter: preSelectedFilter,
						filterToFetchData: getFilterToFetchData.currentValue,
						current: parsedQueryCurrent.currentValue,
						selectedTags: parsedSelectedTags.currentValue,
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
			console.log(error);
			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: false,
				},
			});
		}
	};
};
