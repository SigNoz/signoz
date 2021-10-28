import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSelectedOperation = (
	selectedOperation: TraceReducer['selectedOperation'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'UPDATE_TRACE_SELECTED_OPERATION',
			payload: {
				selectedOperation,
			},
		});
	};
};
