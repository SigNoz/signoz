import { notification } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import getUserOrganization from 'api/user/getOrganization';
import getRolesApi from 'api/user/getRoles';
import getUserApi from 'api/user/getUser';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { t } from 'i18next';
import history from 'lib/history';
import store from 'store';
import AppActions from 'types/actions';
import {
	LOGGED_IN,
	UPDATE_USER,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
	UPDATE_USER_IS_FETCH,
	UPDATE_USER_ORG_ROLE,
} from 'types/actions/app';

const afterLogin = async (
	userId: string,
	authToken: string,
	refreshToken: string,
): Promise<void> => {
	setLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN, authToken);
	setLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN, refreshToken);

	store.dispatch<AppActions>({
		type: UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
		payload: {
			accessJwt: authToken,
			refreshJwt: refreshToken,
		},
	});

	const [rolesResponse, userOrgResponse, getUserResponse] = await Promise.all([
		getRolesApi({
			userId,
			token: authToken,
		}),
		getUserOrganization(authToken),
		getUserApi({
			userId,
			token: authToken,
		}),
	]);

	if (
		rolesResponse.statusCode === 200 &&
		userOrgResponse.statusCode === 200 &&
		getUserResponse.statusCode === 200
	) {
		store.dispatch<AppActions>({
			type: LOGGED_IN,
			payload: {
				isLoggedIn: true,
			},
		});

		// user details are successfully fetched
		store.dispatch<AppActions>({
			type: UPDATE_USER_ORG_ROLE,
			payload: {
				org: userOrgResponse.payload,
				role: rolesResponse.payload.group_name,
			},
		});

		store.dispatch<AppActions>({
			type: UPDATE_USER,
			payload: {
				...getUserResponse.payload,
				userId,
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

		// user org and roles are successfully fetched update the store and proceed further
	} else {
		store.dispatch({
			type: UPDATE_USER_IS_FETCH,
			payload: {
				isUserFetching: false,
			},
		});
		notification.error({
			message:
				rolesResponse.error || userOrgResponse.error || t('something_went_wrong'),
		});
		history.push(ROUTES.SOMETHING_WENT_WRONG);
	}
};

export default afterLogin;
