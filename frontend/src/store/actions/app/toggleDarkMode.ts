import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const ToggleDarkMode = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'SWITCH_DARK_MODE',
		});
	};
};
