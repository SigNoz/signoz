import deleteLocalStorageKey from 'api/browser/localstorage/remove';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import store from 'store';
import {
	LOGGED_IN,
	UPDATE_ORG,
	UPDATE_USER,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
	UPDATE_USER_ORG_ROLE,
} from 'types/actions/app';

export const Logout = (): void => {
	deleteLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);
	deleteLocalStorageKey(LOCALSTORAGE.IS_IDENTIFIED_USER);
	deleteLocalStorageKey(LOCALSTORAGE.REFRESH_AUTH_TOKEN);
	deleteLocalStorageKey(LOCALSTORAGE.LOGGED_IN_USER_EMAIL);
	deleteLocalStorageKey(LOCALSTORAGE.LOGGED_IN_USER_NAME);
	deleteLocalStorageKey(LOCALSTORAGE.CHAT_SUPPORT);

	store.dispatch({
		type: LOGGED_IN,
		payload: {
			isLoggedIn: false,
		},
	});

	store.dispatch({
		type: UPDATE_USER_ORG_ROLE,
		payload: {
			org: null,
			role: null,
		},
	});

	store.dispatch({
		type: UPDATE_USER,
		payload: {
			ROLE: 'VIEWER',
			email: '',
			name: '',
			orgId: '',
			orgName: '',
			profilePictureURL: '',
			userId: '',
			userFlags: {},
		},
	});

	store.dispatch({
		type: UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
		payload: {
			accessJwt: '',
			refreshJwt: '',
		},
	});

	store.dispatch({
		type: UPDATE_ORG,
		payload: {
			org: [],
		},
	});

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	if (window && window.Intercom) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		window.Intercom('shutdown');
	}

	history.push(ROUTES.LOGIN);
};
