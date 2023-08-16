import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_IS_TAG_ERROR } from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateTagIsError = (
	isTagModalError: TraceReducer['isTagModalError'],
): ((dispatch: Dispatch<AppActions>) => void) => (dispatch): void => {
	dispatch({
		type: UPDATE_IS_TAG_ERROR,
		payload: {
			isTagModalError,
		},
	});
};
