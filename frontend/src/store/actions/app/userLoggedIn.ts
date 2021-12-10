import { IS_LOGGED_IN } from 'constants/auth';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import setLocalStorageKey from 'api/browser/localstorage/set';

export const UserLoggedIn = (): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		setLocalStorageKey(IS_LOGGED_IN, 'yes');

		dispatch({
			type: 'LOGGED_IN',
		});
	};
};
