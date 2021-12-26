import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const GlobalTimeLoading = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'GLOBAL_TIME_LOADING_START',
		});
	};
};
