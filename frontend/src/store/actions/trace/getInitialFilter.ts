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
	parseQueryIntoFilter,
	parseIsSkippedSelection,
} from './util';
import {
	UPDATE_ALL_FILTERS,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import { TraceFilterEnum } from 'types/reducer/trace';
import { notification } from 'antd';
import xor from 'lodash-es/xor';

export const GetInitialTraceFilter = (
	minTime: GlobalReducer['minTime'],
	maxTime: GlobalReducer['maxTime'],
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const query = location.search;

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

			const isSelectionSkipped = parseIsSkippedSelection(query);

			const parsedSelectedTags = parseQueryIntoSelectedTags(
				query,
				traces.selectedTags,
			);

			const parsedFilter = parseQueryIntoFilter(query, traces.filter);

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
				other: Object.fromEntries(
					traces.preSelectedFilter ? [] : getSelectedFilter.currentValue,
				),
			});

			let preSelectedFilter: Map<TraceFilterEnum, string[]> = new Map(
				getSelectedFilter.currentValue,
			);

			if (response.payload && !isSelectionSkipped.currentValue) {
				const diff = traces.preSelectedFilter
					? traces.filterToFetchData
					: xor(traces.filterToFetchData, getFilterToFetchData.currentValue);

				Object.keys(response.payload).map((key) => {
					const value = response.payload[key];
					Object.keys(value)
						// remove maxDuration and minDuration filter from initial selection logic
						.filter((e) => !['maxDuration', 'minDuration'].includes(e))
						.map((preKey) => {
							if (isTraceFilterEnum(key) && diff.find((v) => v === key)) {
								const preValue = preSelectedFilter?.get(key) || [];
								preSelectedFilter?.set(key, [...new Set([...preValue, preKey])]);
							}
						});
				});
			}

			if (response.statusCode === 200) {
				const initialFilter = new Map<TraceFilterEnum, Record<string, string>>(
					parsedFilter.currentValue,
				);

				Object.keys(response.payload).forEach((key) => {
					const value = response.payload[key];
					if (isTraceFilterEnum(key)) {
						initialFilter.set(key, {
							...initialFilter.get(key),
							...value,
						});
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

				// updateURL(
				// 	preSelectedFilter,
				// 	getFilterToFetchData.currentValue,
				// 	parsedQueryCurrent.currentValue,
				// 	parsedSelectedTags.currentValue,
				// );
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
