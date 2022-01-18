import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
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
