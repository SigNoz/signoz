import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSpanLoading = (
	spansLoading: TraceReducer['spansLoading'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_SPANS_LOADING',
			payload: {
				loading: spansLoading,
			},
		});
	};
};
