import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import getFiltersApi from 'api/trace/getFilters';
import { TraceFilterEnum } from 'types/reducer/trace';
import isEmpty from 'lodash-es/isEmpty';
import { parseQuery, updateURL } from './util';

export const GetInitialFilter = (
	query: string,
): ((dispatch: Dispatch<AppActions>, getState: () => AppState) => void) => {
	return async (dispatch, getState): Promise<void> => {
		try {
			const { globalTime, traces } = getState();

			const parsedQueryFilter = parseQuery(query);

			// only need to run when there is no filters update
			if (!isEmpty(parsedQueryFilter)) {
				return;
			}

			const initialFilters = new Map<TraceFilterEnum, Record<string, string>>();

			dispatch({
				type: UPDATE_TRACE_FILTER_LOADING,
				payload: {
					filterLoading: true,
				},
			});

			const response = await getFiltersApi({
				end: String(globalTime.maxTime),
				getFilters: traces.filterToFetchData,
				start: String(globalTime.minTime),
				other: {},
			});

			if (response.statusCode === 200) {
				Object.keys(response.payload).forEach((value) => {
					const objValue = response.payload[value];
					if (!isEmpty(objValue)) {
						initialFilters.set(value as TraceFilterEnum, objValue);
					}
				});

				dispatch({
					type: UPDATE_TRACE_FILTER,
					payload: {
						filter: initialFilters,
					},
				});

				updateURL(
					initialFilters,
					traces.selectedFilter,
					traces.filterToFetchData,
					traces.spansAggregate.currentPage,
				);
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
