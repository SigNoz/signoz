import { notification } from 'antd';
import loginApi from 'api/user/login';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import AppActions from 'types/actions';
import { UPDATE_USER_IS_FETCH } from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import routes from './routes';
import afterLogin from './utils';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const mapRoutes = useMemo(() => new Map(routes.map((e) => [e.path, e])), []);
	const { isUserFetching, isUserFetchingError, isLoggedIn } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);
	const { t } = useTranslation(['common']);

	const currentRoute = mapRoutes.get(history.location.pathname);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (currentRoute) {
					const { isPrivate } = currentRoute;

					if (isPrivate) {
						const localStorageUserAuthToken = getInitialUserTokenRefreshToken();

						if (localStorageUserAuthToken && localStorageUserAuthToken.refreshJwt) {
							// localstorage token is present
							const { refreshJwt } = localStorageUserAuthToken;

							// renew web access token
							const response = await loginApi({
								refreshToken: refreshJwt,
							});

							if (response.statusCode === 200) {
								// get all resource and put it over redux
								await afterLogin(
									response.payload.userId,
									response.payload.accessJwt,
									response.payload.refreshJwt,
								);
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
						// no need to fetch the user and make user fetching false
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});

						// if (history.location.pathname !== ROUTES.LOGIN) {
						// 	history.push(ROUTES.LOGIN);
						// }
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

					// if route is not listed in the allRoutes
					history.push(ROUTES.NOT_FOUND);
				}
			} catch (error) {
				// something went wrong
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();
		// need to run over mount only
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, currentRoute]);

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
