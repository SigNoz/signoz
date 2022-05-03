import deleteLocalStorageKey from 'api/browser/localstorage/remove';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import store from 'store';
import { LOGGED_IN, UPDATE_USER_IS_FETCH } from 'types/actions/app';

export const Logout = (): void => {
	deleteLocalStorageKey(LOCALSTORAGE.REFRESH_AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);

	store.dispatch({
		type: UPDATE_USER_IS_FETCH,
		payload: {
			isUserFetching: false,
		},
	});

	store.dispatch({
		type: LOGGED_IN,
		payload: {
			isLoggedIn: false,
		},
	});

	// navigate to login
	history.push(ROUTES.LOGIN);
};
