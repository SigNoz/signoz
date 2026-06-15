import { LOCALSTORAGE } from 'constants/localStorage';

import { clearAuthStorage } from '../clearAuthStorage';

describe('clearAuthStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('removes all auth-related localStorage keys', () => {
		localStorage.setItem(LOCALSTORAGE.AUTH_TOKEN, 'access');
		localStorage.setItem(LOCALSTORAGE.REFRESH_AUTH_TOKEN, 'refresh');
		localStorage.setItem(LOCALSTORAGE.IS_LOGGED_IN, 'true');
		localStorage.setItem(LOCALSTORAGE.LOGGED_IN_USER_EMAIL, 'old@example.com');
		localStorage.setItem(LOCALSTORAGE.LOGGED_IN_USER_NAME, 'old');
		localStorage.setItem(LOCALSTORAGE.IS_IDENTIFIED_USER, 'true');
		localStorage.setItem(LOCALSTORAGE.USER_ID, 'abc');

		clearAuthStorage();

		expect(localStorage.getItem(LOCALSTORAGE.AUTH_TOKEN)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.REFRESH_AUTH_TOKEN)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.IS_LOGGED_IN)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.LOGGED_IN_USER_EMAIL)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.LOGGED_IN_USER_NAME)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.IS_IDENTIFIED_USER)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.USER_ID)).toBeNull();
	});

	it('preserves non-auth localStorage keys', () => {
		localStorage.setItem(LOCALSTORAGE.THEME, 'dark');
		localStorage.setItem(LOCALSTORAGE.AUTH_TOKEN, 'access');

		clearAuthStorage();

		expect(localStorage.getItem(LOCALSTORAGE.THEME)).toBe('dark');
		expect(localStorage.getItem(LOCALSTORAGE.AUTH_TOKEN)).toBeNull();
	});
});
