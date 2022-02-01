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
	return (_, getState): void => {
		const { traces } = getState();

		const { selectedFilter, filterToFetchData } = traces;

		selectedFilter.delete(props);

		updateURL(
			traces.selectedFilter,
			filterToFetchData,
			traces.spansAggregate.currentPage,
			traces.selectedTags,
			traces.filter,
		);
	};
};
