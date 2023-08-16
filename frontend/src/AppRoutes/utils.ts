import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import getUserApi from 'api/user/getUser';
import { Logout } from 'api/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import store from 'store';
import AppActions from 'types/actions';
import {
	LOGGED_IN,
	UPDATE_USER,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
	UPDATE_USER_IS_FETCH,
} from 'types/actions/app';
import { SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getUser';

const afterLogin = async (
	userId: string,
	authToken: string,
	refreshToken: string,
): Promise<SuccessResponse<PayloadProps> | undefined> => {
	setLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN, authToken);
	setLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN, refreshToken);

	store.dispatch<AppActions>({
		type: UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
		payload: {
			accessJwt: authToken,
			refreshJwt: refreshToken,
		},
	});

	const [getUserResponse] = await Promise.all([
		getUserApi({
			userId,
			token: authToken,
		}),
	]);

	if (getUserResponse.statusCode === 200 && getUserResponse.payload) {
		store.dispatch<AppActions>({
			type: LOGGED_IN,
			payload: {
				isLoggedIn: true,
			},
		});

		const { payload } = getUserResponse;

		store.dispatch<AppActions>({
			type: UPDATE_USER,
			payload: {
				ROLE: payload.role,
				email: payload.email,
				name: payload.name,
				orgName: payload.organization,
				profilePictureURL: payload.profilePictureURL,
				userId: payload.id,
				orgId: payload.orgId,
				userFlags: payload.flags,
			},
		});

		const isLoggedInLocalStorage = getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN);

		if (isLoggedInLocalStorage === null) {
			setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
		}

		store.dispatch({
			type: UPDATE_USER_IS_FETCH,
			payload: {
				isUserFetching: false,
			},
		});

		return getUserResponse;
	}

	store.dispatch({
		type: UPDATE_USER_IS_FETCH,
		payload: {
			isUserFetching: false,
		},
	});

	Logout();

	return undefined;
};

export default afterLogin;
