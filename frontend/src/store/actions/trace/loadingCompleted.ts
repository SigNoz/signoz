import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const LoadingCompleted = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'GET_TRACE_LOADING_END',
		});
	};
};
