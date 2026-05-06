import deleteLocalStorageKey from 'api/browser/localstorage/remove';
import { LOCALSTORAGE } from 'constants/localStorage';

const AUTH_KEYS: LOCALSTORAGE[] = [
	LOCALSTORAGE.AUTH_TOKEN,
	LOCALSTORAGE.REFRESH_AUTH_TOKEN,
	LOCALSTORAGE.IS_LOGGED_IN,
	LOCALSTORAGE.LOGGED_IN_USER_EMAIL,
	LOCALSTORAGE.LOGGED_IN_USER_NAME,
	LOCALSTORAGE.IS_IDENTIFIED_USER,
	LOCALSTORAGE.USER_ID,
];

export const clearAuthStorage = (): void => {
	AUTH_KEYS.forEach((key) => deleteLocalStorageKey(key));
};
