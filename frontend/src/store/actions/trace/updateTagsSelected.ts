import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';
import { UPDATE_SELECTED_TAGS } from 'types/actions/trace';

export const UpdateSelectedTags = (
	selectedTags: TraceReducer['selectedTags'],
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return (dispatch, getState): void => {
		dispatch({
			type: UPDATE_SELECTED_TAGS,
			payload: {
				selectedTags: selectedTags,
			},
		});
	};
};
