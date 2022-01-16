import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum } from 'types/reducer/trace';
import { updateURL } from './util';

export const ClearAllFilter = (
	props: TraceFilterEnum,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return (dispatch, getState): void => {
		const { traces } = getState();

		const { filterToFetchData } = traces;

		const updatedFilterToFetchTheData = [
			...filterToFetchData.filter((e) => e == props),
		];

		updateURL(traces.filter, traces.selectedFilter, updatedFilterToFetchTheData);
	};
};
