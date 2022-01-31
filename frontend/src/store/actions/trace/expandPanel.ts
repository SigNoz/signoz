import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import { updateURL } from './util';
import getFilters from 'api/trace/getFilters';
import { UPDATE_TRACE_FILTER_LOADING } from 'types/actions/trace';

export const ExpandPanel = (
	props: TraceFilterEnum,
	isOpen: boolean,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		const { traces, globalTime } = getState();

		const { filterToFetchData } = traces;
		const updatedSelectedFilter = new Map<TraceFilterEnum, string[]>(
			traces.selectedFilter,
		);

		dispatch({
			type: UPDATE_TRACE_FILTER_LOADING,
			payload: {
				filterLoading: true,
			},
		});

		let updatedFilterToFetchTheData: TraceReducer['filterToFetchData'] = [];

		if (isOpen) {
			updatedFilterToFetchTheData = [...new Set([...filterToFetchData, props])];

			const response = await getFilters({
				start: String(globalTime.minTime),
				end: String(globalTime.maxTime),
				getFilters: [props],
				other: {},
			});

			if (response.statusCode === 200 && response.payload) {
				updatedSelectedFilter.set(
					props,
					Object.keys(response.payload[props]).map((e) => e),
				);
			}
		} else {
			updatedFilterToFetchTheData = filterToFetchData.filter((e) => e !== props);
			updatedSelectedFilter.delete(props);
		}

		updateURL(
			updatedSelectedFilter,
			updatedFilterToFetchTheData,
			traces.spansAggregate.currentPage,
			traces.selectedTags,
		);
	};
};
