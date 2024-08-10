/* eslint-disable react-hooks/exhaustive-deps */
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import { Logout } from 'api/utils';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { ReactChild, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath, Redirect, useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import AppActions from 'types/actions';
import { UPDATE_USER_IS_FETCH } from 'types/actions/app';
import AppReducer from 'types/reducer/app';
import { routePermission } from 'utils/permission';

import routes, {
	LIST_LICENSES,
	oldNewRoutesMapping,
	oldRoutes,
} from './routes';
import afterLogin from './utils';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const location = useLocation();
	const { pathname } = location;

	const mapRoutes = useMemo(
		() =>
			new Map(
				[...routes, LIST_LICENSES].map((e) => {
					const currentPath = matchPath(pathname, {
						path: e.path,
					});
					return [currentPath === null ? null : 'current', e];
				}),
			),
		[pathname],
	);

	const {
		data: licensesData,
		isFetching: isFetchingLicensesData,
	} = useLicense();

	const {
		isUserFetching,
		isUserFetchingError,
		isLoggedIn: isLoggedInState,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const { t } = useTranslation(['common']);
	const localStorageUserAuthToken = getInitialUserTokenRefreshToken();

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { notifications } = useNotifications();

	const currentRoute = mapRoutes.get('current');

	const isOldRoute = oldRoutes.indexOf(pathname) > -1;

	const isLocalStorageLoggedIn =
		getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true';

	const navigateToLoginIfNotLoggedIn = (isLoggedIn = isLoggedInState): void => {
		dispatch({
			type: UPDATE_USER_IS_FETCH,
			payload: {
				isUserFetching: false,
			},
		});
		if (!isLoggedIn) {
			history.push(ROUTES.LOGIN, { from: pathname });
		}
	};

	const handleUserLoginIfTokenPresent = async (
		key: keyof typeof ROUTES,
	): Promise<void> => {
		if (localStorageUserAuthToken?.refreshJwt) {
			// localstorage token is present

			// renew web access token
			const response = await loginApi({
				refreshToken: localStorageUserAuthToken?.refreshJwt,
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
					route &&
					route.find((e) => e === userResponse.payload.role) === undefined
				) {
					history.push(ROUTES.UN_AUTHORIZED);
				}
			} else {
				Logout();

				notifications.error({
					message: response.error || t('something_went_wrong'),
				});
			}
		}
	};

	const handlePrivateRoutes = async (
		key: keyof typeof ROUTES,
	): Promise<void> => {
		if (
			localStorageUserAuthToken &&
			localStorageUserAuthToken.refreshJwt &&
			isUserFetching
		) {
			handleUserLoginIfTokenPresent(key);
		} else {
			// user does have localstorage values

			navigateToLoginIfNotLoggedIn(isLocalStorageLoggedIn);
		}
	};

	const navigateToWorkSpaceBlocked = (route: any): void => {
		const { path } = route;

		if (path && path !== ROUTES.WORKSPACE_LOCKED) {
			history.push(ROUTES.WORKSPACE_LOCKED);

			dispatch({
				type: UPDATE_USER_IS_FETCH,
				payload: {
					isUserFetching: false,
				},
			});
		}
	};

	useEffect(() => {
		if (!isFetchingLicensesData) {
			const shouldBlockWorkspace = licensesData?.payload?.workSpaceBlock;

			if (shouldBlockWorkspace) {
				navigateToWorkSpaceBlocked(currentRoute);
			}
		}
	}, [isFetchingLicensesData]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (isOldRoute) {
					const redirectUrl = oldNewRoutesMapping[pathname];

					const newLocation = {
						...location,
						pathname: redirectUrl,
					};
					history.replace(newLocation);
				}

				if (currentRoute) {
					const { isPrivate, key } = currentRoute;

					if (isPrivate && key !== String(ROUTES.WORKSPACE_LOCKED)) {
						handlePrivateRoutes(key);
					} else {
						// no need to fetch the user and make user fetching false

						if (getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true') {
							history.push(ROUTES.APPLICATION);
						}
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});
					}
				} else if (pathname === ROUTES.HOME_PAGE) {
					// routing to application page over root page
					if (isLoggedInState) {
						history.push(ROUTES.APPLICATION);
					} else {
						navigateToLoginIfNotLoggedIn();
					}
				} else {
					// not found
					navigateToLoginIfNotLoggedIn(isLocalStorageLoggedIn);
				}
			} catch (error) {
				// something went wrong
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();
	}, [dispatch, isLoggedInState, currentRoute, licensesData]);

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
	children: ReactChild;
}

export default PrivateRoute;
