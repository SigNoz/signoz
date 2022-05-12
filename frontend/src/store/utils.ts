import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { User } from 'types/reducer/app';

export const getInitialUserTokenRefreshToken = (): AuthTokenProps | null => {
	const accessJwt = getLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN);
	const refreshJwt = getLocalStorageKey(LOCALSTORAGE.REFRESH_AUTH_TOKEN);

	if (accessJwt && refreshJwt) {
		return {
			accessJwt,
			refreshJwt,
		};
	}

	return null;
};

interface AuthTokenProps {
	accessJwt: User['accessJwt'];
	refreshJwt: User['refreshJwt'];
}
