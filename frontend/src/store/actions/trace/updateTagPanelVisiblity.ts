import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_TAG_MODAL_VISIBILITY } from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateTagVisibility = (
	isTagModalOpen: TraceReducer['isTagModalOpen'],
): ((dispatch: Dispatch<AppActions>) => void) => (dispatch): void => {
	dispatch({
		type: UPDATE_TAG_MODAL_VISIBILITY,
		payload: {
			isTagModalOpen,
		},
	});
};
