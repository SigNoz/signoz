import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

const afterLogin = (
	userId: string,
	authToken: string,
	refreshToken: string,
	interceptorRejected?: boolean,
): void => {
	setLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN, authToken);
	setLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN, refreshToken);
	setLocalStorageApi(LOCALSTORAGE.USER_ID, userId);
	setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');

	if (!interceptorRejected) {
		window.dispatchEvent(
			new CustomEvent('AFTER_LOGIN', {
				detail: {
					accessJWT: authToken,
					refreshJWT: refreshToken,
					id: userId,
				},
			}),
		);
	}
};

export default afterLogin;
