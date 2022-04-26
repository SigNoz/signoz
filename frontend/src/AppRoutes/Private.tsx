import { notification } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import deleteLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageApi from 'api/browser/localstorage/set';
import getUserOrganization from 'api/user/getOrganization';
import getRolesApi from 'api/user/getRoles';
import loginApi from 'api/user/login';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import AppActions from 'types/actions';
import {
	LOGGED_IN,
	UPDATE_USER_IS_FETCH,
	UPDATE_USER_ORG_ROLE,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import routes from './routes';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const { pathname } = useLocation();
	const mapRoutes = useMemo(() => new Map(routes.map((e) => [e.path, e])), []);
	const {
		// user,
		isUserFetching,
		isUserFetchingError,
		isLoggedIn,
	} = useSelector<AppState, AppReducer>((state) => state.app);
	const { t } = useTranslation(['common']);

	const currentRoute = mapRoutes.get(pathname);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const somethingGoesWrongDeleteTokenAndNavigationToLogin = useCallback(() => {
		// localstorage token is missing
		deleteLocalStorageKey(LOCALSTORAGE.REFRESH_AUTH_TOKEN);
		deleteLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN);
		deleteLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);

		dispatch({
			type: UPDATE_USER_IS_FETCH,
			payload: {
				isUserFetching: false,
			},
		});

		dispatch({
			type: LOGGED_IN,
			payload: {
				isLoggedIn: false,
			},
		});

		// navigate to login
		history.push(ROUTES.LOGIN);
	}, [dispatch]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (currentRoute) {
					const { isPrivate, redirectIfNotLoggedIn } = currentRoute;

					if (isPrivate) {
						const localStorageUserAuthToken = getInitialUserTokenRefreshToken();

						// localstorage token is present
						if (localStorageUserAuthToken && localStorageUserAuthToken.refreshJwt) {
							const { refreshJwt } = localStorageUserAuthToken;

							// renew web access token
							const response = await loginApi({
								refreshToken: refreshJwt,
							});

							if (response.statusCode === 200) {
								// get all resource and put it over redux
								const [rolesResponse, userOrgResponse] = await Promise.all([
									getRolesApi({
										userId: response.payload.userId,
									}),
									getUserOrganization(),
								]);

								if (
									rolesResponse.statusCode === 200 &&
									userOrgResponse.statusCode === 200
								) {
									const isLoggedInLocalStorage = getLocalStorageApi(
										LOCALSTORAGE.IS_LOGGED_IN,
									);
									// user details are successfully fetched
									dispatch({
										type: UPDATE_USER_ORG_ROLE,
										payload: {
											org: userOrgResponse.payload,
											role: rolesResponse.payload.group_name,
										},
									});

									if (isLoggedInLocalStorage === null) {
										setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
									}

									dispatch({
										type: LOGGED_IN,
										payload: {
											isLoggedIn: true,
										},
									});

									dispatch({
										type: UPDATE_USER_IS_FETCH,
										payload: {
											isUserFetching: false,
										},
									});

									// user org and roles are successfully fetched update the store and proceed further
								} else {
									notification.error({
										message:
											rolesResponse.error ||
											userOrgResponse.error ||
											t('something_went_wrong'),
									});
									// fetching the response makes some error re routing to login
									somethingGoesWrongDeleteTokenAndNavigationToLogin();
								}
							} else {
								notification.error({
									message: response.error || t('something_went_wrong'),
								});
								// fetching the response from the user auth token
								somethingGoesWrongDeleteTokenAndNavigationToLogin();
							}
						} else {
							// token is not present
							somethingGoesWrongDeleteTokenAndNavigationToLogin();
						}
					} else {
						if (pathname !== ROUTES.LOGIN && redirectIfNotLoggedIn) {
							history.push(ROUTES.LOGIN);
						}

						// no need to fetch the user and make user fetching false
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});
					}
				} else if (pathname === ROUTES.HOME_PAGE) {
					// routing to application page over root page
					if (isLoggedIn) {
						history.push(ROUTES.APPLICATION);
					} else {
						history.push(ROUTES.LOGIN);
					}
				} else {
					// if route is not listed in the allRoutes
					history.push(ROUTES.NOT_FOUND);
				}
			} catch (error) {
				// something went wrong
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();

		// need to run over mount only and once
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (isUserFetchingError) {
		return <Redirect to={ROUTES.SOMETHING_WENT_WRONG} />;
	}

	if (isUserFetching) {
		return <Spinner tip="Loading..." />;
	}

	// NOTE: disabling this rule as there is no need to have div
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{children}</>;
}

interface PrivateRouteProps {
	children: React.ReactChild;
}

export default PrivateRoute;
