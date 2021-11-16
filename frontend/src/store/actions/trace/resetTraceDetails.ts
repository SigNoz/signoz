import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const ResetRaceData = (): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'RESET_TRACE_DATA',
		});
	};
};
