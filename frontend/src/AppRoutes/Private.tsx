import { notification } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath, Redirect } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import AppActions from 'types/actions';
import { UPDATE_USER_IS_FETCH } from 'types/actions/app';
import AppReducer from 'types/reducer/app';
import { routePermission } from 'utils/permission';

import routes from './routes';
import afterLogin from './utils';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const mapRoutes = useMemo(
		() =>
			new Map(
				routes.map((e) => {
					const currentPath = matchPath(history.location.pathname, {
						path: e.path,
					});
					return [currentPath === null ? null : 'current', e];
				}),
			),
		[],
	);
	const { isUserFetching, isUserFetchingError } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const { t } = useTranslation(['common']);

	const currentRoute = mapRoutes.get('current');
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const isLoggedIn = getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				console.log('asdasd');

				if (currentRoute) {
					const { isPrivate, key } = currentRoute;

					if (isPrivate) {
						const localStorageUserAuthToken = getInitialUserTokenRefreshToken();

						if (isLoggedIn) {
							if (localStorageUserAuthToken && localStorageUserAuthToken.refreshJwt) {
								// localstorage token is present
								const { refreshJwt } = localStorageUserAuthToken;

								// renew web access token
								const response = await loginApi({
									refreshToken: refreshJwt,
								});

								if (response.statusCode === 200) {
									const route = routePermission[key];

									// get all resource and put it over redux
									const userResponse = await afterLogin(
										response.payload.userId,
										response.payload.accessJwt,
										response.payload.refreshJwt,
									);

									if (
										userResponse &&
										route.find((e) => e === userResponse.payload.role) === undefined
									) {
										history.push(ROUTES.UN_AUTHORIZED);
									}
								} else {
									notification.error({
										message: response.error || t('something_went_wrong'),
									});
								}
							} else {
								// user is not logged in
								dispatch({
									type: UPDATE_USER_IS_FETCH,
									payload: {
										isUserFetching: false,
									},
								});
								history.push(ROUTES.LOGIN);
							}
						} else {
							dispatch({
								type: UPDATE_USER_IS_FETCH,
								payload: {
									isUserFetching: false,
								},
							});

							history.push(ROUTES.LOGIN);
						}
					} else {
						// no need to fetch the user and make user fetching false
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});
					}
				} else if (history.location.pathname === ROUTES.HOME_PAGE) {
					// routing to application page over root page
					if (isLoggedIn) {
						history.push(ROUTES.APPLICATION);
					} else {
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});

						history.push(ROUTES.LOGIN);
					}
				} else {
					dispatch({
						type: UPDATE_USER_IS_FETCH,
						payload: {
							isUserFetching: false,
						},
					});
					if (!isLoggedIn) {
						history.push(ROUTES.LOGIN);
					}
				}
			} catch (error) {
				// something went wrong
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();
		// need to run over mount only
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, currentRoute, isLoggedIn]);

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
