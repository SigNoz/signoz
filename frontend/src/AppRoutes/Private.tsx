/* eslint-disable react-hooks/exhaustive-deps */
import getLocalStorageApi from 'api/browser/localstorage/get';
import getOrgUser from 'api/user/getOrgUser';
import loginApi from 'api/user/login';
import { Logout } from 'api/utils';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { ReactChild, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath, Redirect, useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { getInitialUserTokenRefreshToken } from 'store/utils';
import AppActions from 'types/actions';
import { UPDATE_USER_IS_FETCH } from 'types/actions/app';
import { Organization } from 'types/api/user/getOrganization';
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

	const { org, orgPreferences } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const [isOnboardingComplete, setIsOnboardingComplete] = useState<
		boolean | null
	>(null);

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

	useEffect(() => {
		if (orgPreferences && !isEmpty(orgPreferences)) {
			const onboardingPreference = orgPreferences?.find(
				(preference: Record<string, any>) => preference.key === 'ORG_ONBOARDING',
			);

			if (onboardingPreference) {
				setIsOnboardingComplete(onboardingPreference.value);
			}
		}
	}, [orgPreferences]);

	const {
		data: licensesData,
		isFetching: isFetchingLicensesData,
	} = useLicense();

	const {
		isUserFetching,
		isUserFetchingError,
		isLoggedIn: isLoggedInState,
		isFetchingOrgPreferences,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const { t } = useTranslation(['common']);

	const localStorageUserAuthToken = getInitialUserTokenRefreshToken();

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { notifications } = useNotifications();

	const currentRoute = mapRoutes.get('current');

	const isOldRoute = oldRoutes.indexOf(pathname) > -1;

	const [orgData, setOrgData] = useState<Organization | undefined>(undefined);

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

	const { data: orgUsers, isLoading: isLoadingOrgUsers } = useQuery({
		queryFn: () => {
			if (orgData && orgData.id !== undefined) {
				return getOrgUser({
					orgId: orgData.id,
				});
			}
			return undefined;
		},
		queryKey: ['getOrgUser'],
		enabled: !isEmpty(orgData),
	});

	const checkFirstTimeUser = (): boolean => {
		const users = orgUsers?.payload || [];

		const remainingUsers = users.filter(
			(user) => user.email !== 'admin@signoz.cloud',
		);

		return remainingUsers.length === 1;
	};

	// Check if the onboarding should be shown based on the org users and onboarding completion status, wait for org users and preferences to load
	const shouldShowOnboarding = (): boolean => {
		// Only run this effect if the org users and preferences are loaded
		if (!isLoadingOrgUsers) {
			const isFirstUser = checkFirstTimeUser();

			// Redirect to get started if it's not the first user or if the onboarding is complete
			return isFirstUser && !isOnboardingComplete;
		}

		return false;
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

				const showOnboarding = shouldShowOnboarding();

				if (
					userResponse &&
					showOnboarding &&
					userResponse.payload.role === 'ADMIN'
				) {
					history.push(ROUTES.ONBOARDING);
				}

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

	useEffect(() => {
		if (org && org.length > 0 && org[0].id !== undefined) {
			setOrgData(org[0]);
		}
	}, [org]);

	const handleRouting = (): void => {
		const showOnboarding = shouldShowOnboarding();

		if (showOnboarding) {
			history.push(ROUTES.ONBOARDING);
		} else {
			history.push(ROUTES.APPLICATION);
		}
	};

	useEffect(() => {
		// Only run this effect if the org users and preferences are loaded
		if (!isLoadingOrgUsers && isOnboardingComplete !== null) {
			const isFirstUser = checkFirstTimeUser();

			// Redirect to get started if it's not the first user or if the onboarding is complete
			if (isFirstUser && !isOnboardingComplete) {
				history.push(ROUTES.ONBOARDING);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoadingOrgUsers, isOnboardingComplete, orgUsers]);

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
							handleRouting();
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
						handleRouting();
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

	if (isUserFetching || (isLoggedInState && isFetchingOrgPreferences)) {
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
