import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import { updateURL } from './util';

export const ExpandPanel = (
	props: TraceFilterEnum,
	isOpen: boolean,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return (_, getState): void => {
		const { traces, globalTime } = getState();

		const { filterToFetchData } = traces;

		let updatedFilterToFetchTheData: TraceReducer['filterToFetchData'] = [];

		if (isOpen) {
			updatedFilterToFetchTheData = [...new Set([...filterToFetchData, props])];
		} else {
			updatedFilterToFetchTheData = filterToFetchData.filter((e) => e !== props);
		}

		updateURL(
			traces.selectedFilter,
			updatedFilterToFetchTheData,
			traces.spansAggregate.currentPage,
		);
	};
};
