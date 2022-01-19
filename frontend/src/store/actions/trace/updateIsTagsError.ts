import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';
import { UPDATE_IS_TAG_ERROR } from 'types/actions/trace';

export const UpdateTagIsError = (
	isTagModalError: TraceReducer['isTagModalError'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch): void => {
		dispatch({
			type: UPDATE_IS_TAG_ERROR,
			payload: {
				isTagModalError,
			},
		});
	};
};
