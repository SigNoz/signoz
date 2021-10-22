import { IS_LOGGED_IN } from 'constants/auth';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UserLoggedIn = (): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		localStorage.setItem(IS_LOGGED_IN, 'yes');

		dispatch({
			type: 'LOGGED_IN',
		});
	};
};
