import deleteLocalStorageKey from 'api/browser/localstorage/remove';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';

export const Logout = (): void => {
	deleteLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);
	deleteLocalStorageKey(LOCALSTORAGE.IS_IDENTIFIED_USER);
	deleteLocalStorageKey(LOCALSTORAGE.REFRESH_AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.LOGGED_IN_USER_EMAIL);
	deleteLocalStorageKey(LOCALSTORAGE.LOGGED_IN_USER_NAME);
	deleteLocalStorageKey(LOCALSTORAGE.CHAT_SUPPORT);
	deleteLocalStorageKey(LOCALSTORAGE.USER_ID);

	window.dispatchEvent(new CustomEvent('LOGOUT'));

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	if (window && window.Intercom) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		window.Intercom('shutdown');
	}

	history.push(ROUTES.LOGIN);
};
