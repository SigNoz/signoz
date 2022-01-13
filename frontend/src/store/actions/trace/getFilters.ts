import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getFiltersApi from 'api/trace/getFilters';
import { parseQuery } from './util';
import {
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import history from 'lib/history';
import isEqual from 'lodash-es/isEqual';

export const GetFilter = (
	query: string,
	minTime: GlobalReducer['minTime'],
	maxTime: GlobalReducer['maxTime'],
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		const { globalTime, traces } = getState();

		if (globalTime.maxTime !== maxTime && globalTime.minTime !== minTime) {
			return;
		}

		const { filter } = traces;

		const parsedQueryFilter = parseQuery(query);

		const parsedFilter = Object.fromEntries(parsedQueryFilter);
		const parsedFilterInState = Object.fromEntries(filter);

		// if filter in state and in query are same no need to fetch the filters
		if (isEqual(parsedFilter, parsedFilterInState)) {
			return;
		}

		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: true,
			},
		});

		const response = await getFiltersApi({
			end: String(maxTime),
			getFilters: traces.filterToFetchData,
			start: String(minTime),
			...parsedFilter,
		});

		if (response.statusCode === 200) {
			traces.filterToFetchData.map((e) => {
				traces.filter.set(e, response.payload[e]);
			});

			dispatch({
				type: UPDATE_TRACE_FILTER,
				payload: {
					filter: traces.filter,
				},
			});

			const parsedUpdatedFilter = Object.fromEntries(traces.filter);

			const updatedKey = Object.keys(parsedUpdatedFilter)
				.map((e) => `${e}=${JSON.stringify(parsedUpdatedFilter[e])}`)
				.join('&');

			history.replace(`${history.location.pathname}?${updatedKey}`);
		}

		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: false,
			},
		});
	};
};
