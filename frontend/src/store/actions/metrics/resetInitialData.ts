import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';

export const ResetInitialData = (): ((
	dispatch: Dispatch<AppActions>,
	getState: () => AppState,
) => void) => {
	return (dispatch): void => {
		console.log("RESET DISPATCH")
		dispatch({
			type: 'RESET_INITIAL_APPLICATION_DATA',
		});
	};
};
