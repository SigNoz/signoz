import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';
import { UPDATE_SELECTED_TAGS } from 'types/actions/trace';

export const UpdateSelectedTags = (
	selectedTags: TraceReducer['selectedTags'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: UPDATE_SELECTED_TAGS,
			payload: {
				selectedTags: selectedTags,
			},
		});
	};
};
