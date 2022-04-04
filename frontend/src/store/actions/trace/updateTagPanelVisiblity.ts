import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_TAG_MODAL_VISIBLITY } from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateTagVisiblity = (
	isTagModalOpen: TraceReducer['isTagModalOpen'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: UPDATE_TAG_MODAL_VISIBLITY,
			payload: {
				isTagModalOpen,
			},
		});
	};
};
