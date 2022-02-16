import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';
import { UPDATE_TAG_MODAL_VISIBLITY } from 'types/actions/trace';

export const UpdateTagVisiblity = (
	isTagModalOpen: TraceReducer['isTagModalOpen'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: UPDATE_TAG_MODAL_VISIBLITY,
			payload: {
				isTagModalOpen: isTagModalOpen,
			},
		});
	};
};
