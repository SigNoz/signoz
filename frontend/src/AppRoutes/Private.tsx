import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import getOrgUser from 'api/user/getOrgUser';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { ReactChild, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { matchPath, useLocation } from 'react-router';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';
import { Organization } from 'types/api/user/getOrganization';
import { USER_ROLES } from 'types/roles';
import { safeNavigateNoSameURLMemo } from 'utils/navigate';
import { routePermission } from 'utils/permission';

import routes, {
	LIST_LICENSES,
	oldNewRoutesMapping,
	oldRoutes,
	ROUTES_NOT_TO_BE_OVERRIDEN,
	SUPPORT_ROUTE,
} from './routes';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const { safeNavigate: unsafeNavigate } = useSafeNavigate({
		preventSameUrlNavigation: false,
	});
	const { pathname } = location;
	const {
		org,
		orgPreferences,
		user,
		isLoggedIn: isLoggedInState,
		isFetchingOrgPreferences,
		activeLicenseV3,
		isFetchingActiveLicenseV3,
		trialInfo,
		featureFlags,
	} = useAppContext();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const mapRoutes = useMemo(
		() =>
			new Map(
				[...routes, LIST_LICENSES, SUPPORT_ROUTE].map((e) => {
					const currentPath = matchPath(
						{
							// Temp: Hard type cast
							path: e.path as string,
						},
						pathname,
					);
					return [currentPath === null ? null : 'current', e];
				}),
			),
		[pathname],
	);
	const isOldRoute = oldRoutes.indexOf(pathname) > -1;
	const currentRoute = mapRoutes.get('current');
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const [orgData, setOrgData] = useState<Organization | undefined>(undefined);

	const { data: orgUsers, isFetching: isFetchingOrgUsers } = useQuery({
		queryFn: () => {
			if (orgData && orgData.id !== undefined) {
				return getOrgUser({
					orgId: orgData.id,
				});
			}
			return undefined;
		},
		queryKey: ['getOrgUser'],
		enabled: !isEmpty(orgData) && user.role === 'ADMIN',
	});

	const checkFirstTimeUser = useCallback((): boolean => {
		const users = orgUsers?.payload || [];

		const remainingUsers = users.filter(
			(user) => user.email !== 'admin@signoz.cloud',
		);

		return remainingUsers.length === 1;
	}, [orgUsers?.payload]);

	useEffect(() => {
		if (
			isCloudUserVal &&
			!isFetchingOrgPreferences &&
			orgPreferences &&
			!isFetchingOrgUsers &&
			orgUsers &&
			orgUsers.payload
		) {
			const isOnboardingComplete = orgPreferences?.find(
				(preference: Record<string, any>) => preference.key === 'ORG_ONBOARDING',
			)?.value;

			const isFirstUser = checkFirstTimeUser();
			if (
				isFirstUser &&
				!isOnboardingComplete &&
				// if the current route is allowed to be overriden by org onboarding then only do the same
				!ROUTES_NOT_TO_BE_OVERRIDEN.includes(pathname)
			) {
				safeNavigateNoSameURLMemo(ROUTES.ONBOARDING);
			}
		}
	}, [
		checkFirstTimeUser,
		isCloudUserVal,
		isFetchingOrgPreferences,
		isFetchingOrgUsers,
		orgPreferences,
		orgUsers,
		pathname,
	]);

	const safeNavigateToWorkSpaceBlocked = useCallback(
		(route: any): void => {
			const { path } = route;

			const isRouteEnabledForWorkspaceBlockedState =
				isAdmin &&
				(path === ROUTES.ORG_SETTINGS ||
					path === ROUTES.BILLING ||
					path === ROUTES.MY_SETTINGS);

			if (
				path &&
				path !== ROUTES.WORKSPACE_LOCKED &&
				!isRouteEnabledForWorkspaceBlockedState
			) {
				safeNavigateNoSameURLMemo(ROUTES.WORKSPACE_LOCKED);
			}
		},
		[isAdmin],
	);

	const safeNavigateToWorkSpaceAccessRestricted = useCallback(
		(route: any): void => {
			const { path } = route;

			if (path && path !== ROUTES.WORKSPACE_ACCESS_RESTRICTED) {
				safeNavigateNoSameURLMemo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
			}
		},
		[],
	);

	useEffect(() => {
		if (!isFetchingActiveLicenseV3 && activeLicenseV3) {
			const currentRoute = mapRoutes.get('current');

			const isTerminated = activeLicenseV3.state === LicenseState.TERMINATED;
			const isExpired = activeLicenseV3.state === LicenseState.EXPIRED;
			const isCancelled = activeLicenseV3.state === LicenseState.CANCELLED;

			const isWorkspaceAccessRestricted = isTerminated || isExpired || isCancelled;

			const { platform } = activeLicenseV3;

			if (
				isWorkspaceAccessRestricted &&
				platform === LicensePlatform.CLOUD &&
				currentRoute
			) {
				safeNavigateToWorkSpaceAccessRestricted(currentRoute);
			}
		}
	}, [
		isFetchingActiveLicenseV3,
		activeLicenseV3,
		mapRoutes,
		pathname,
		safeNavigateToWorkSpaceAccessRestricted,
	]);

	useEffect(() => {
		if (!isFetchingActiveLicenseV3) {
			const currentRoute = mapRoutes.get('current');
			const shouldBlockWorkspace = trialInfo?.workSpaceBlock;

			if (
				shouldBlockWorkspace &&
				currentRoute &&
				activeLicenseV3?.platform === LicensePlatform.CLOUD
			) {
				safeNavigateToWorkSpaceBlocked(currentRoute);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFetchingActiveLicenseV3,
		trialInfo?.workSpaceBlock,
		activeLicenseV3?.platform,
		mapRoutes,
		pathname,
		safeNavigateToWorkSpaceBlocked,
	]);

	const safeNavigateToWorkSpaceSuspended = useCallback((route: any): void => {
		const { path } = route;

		if (path && path !== ROUTES.WORKSPACE_SUSPENDED) {
			safeNavigateNoSameURLMemo(ROUTES.WORKSPACE_SUSPENDED);
		}
	}, []);

	useEffect(() => {
		if (!isFetchingActiveLicenseV3 && activeLicenseV3) {
			const currentRoute = mapRoutes.get('current');
			const shouldSuspendWorkspace =
				activeLicenseV3.state === LicenseState.DEFAULTED;

			if (
				shouldSuspendWorkspace &&
				currentRoute &&
				activeLicenseV3.platform === LicensePlatform.CLOUD
			) {
				safeNavigateToWorkSpaceSuspended(currentRoute);
			}
		}
	}, [
		isFetchingActiveLicenseV3,
		activeLicenseV3,
		mapRoutes,
		pathname,
		safeNavigateToWorkSpaceSuspended,
	]);

	useEffect(() => {
		if (org && org.length > 0 && org[0].id !== undefined) {
			setOrgData(org[0]);
		}
	}, [org]);

	// if the feature flag is enabled and the current route is /get-started then redirect to /get-started-with-signoz-cloud
	useEffect(() => {
		if (
			currentRoute?.path === ROUTES.GET_STARTED &&
			featureFlags?.find((e) => e.name === FeatureKeys.ONBOARDING_V3)?.active
		) {
			safeNavigateNoSameURLMemo(ROUTES.GET_STARTED_WITH_CLOUD);
		}
	}, [currentRoute, featureFlags]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		// if it is an old route safeNavigate to the new route
		if (isOldRoute) {
			const redirectUrl = oldNewRoutesMapping[pathname];

			const newLocation = {
				...location,
				pathname: redirectUrl,
			};

			safeNavigateNoSameURLMemo(newLocation, { replace: true });
			return;
		}
		// if the current route
		if (currentRoute) {
			const { isPrivate, key } = currentRoute;
			if (isPrivate) {
				if (isLoggedInState) {
					const route = routePermission[key];
					if (route && route.find((e) => e === user.role) === undefined) {
						safeNavigateNoSameURLMemo(ROUTES.UN_AUTHORIZED);
					}
				} else {
					setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, pathname);
					safeNavigateNoSameURLMemo(ROUTES.LOGIN);
				}
			} else if (isLoggedInState) {
				const fromPathname = getLocalStorageApi(
					LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT,
				);
				if (fromPathname) {
					safeNavigateNoSameURLMemo(fromPathname);
					setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, '');
				} else if (pathname !== ROUTES.SOMETHING_WENT_WRONG) {
					safeNavigateNoSameURLMemo(ROUTES.HOME);
				}
			} else {
				// do nothing as the unauthenticated routes are LOGIN and SIGNUP and the LOGIN container takes care of routing to signup if
				// setup is not completed
			}
		} else if (isLoggedInState) {
			const fromPathname = getLocalStorageApi(
				LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT,
			);
			if (fromPathname) {
				safeNavigateNoSameURLMemo(fromPathname);
				setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, '');
			} else {
				safeNavigateNoSameURLMemo(ROUTES.HOME);
			}
		} else {
			setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, pathname);
			safeNavigateNoSameURLMemo(ROUTES.LOGIN);
		}
	}, [isLoggedInState, pathname, user, isOldRoute, currentRoute, location]);

	// global event listener for NAVIGATE event
	// This will provide access to useNavigation hook from outside of components
	useGlobalEventListener('SAFE_NAVIGATE', (event: CustomEvent) => {
		const { to, options } = event.detail;
		console.log('🚀 ~ useGlobalEventListener ~ SAFE_NAVIGATE:', to, options);
		if (to) {
			safeNavigate(to, options);
		}
	});

	useGlobalEventListener('UNSAFE_NAVIGATE', (event: CustomEvent) => {
		const { to, options } = event.detail;
		console.log('🚀 ~ useGlobalEventListener ~ UNSAFE_NAVIGATE:', to, options);
		if (to) {
			unsafeNavigate(to, options);
		}
	});

	// NOTE: disabling this rule as there is no need to have div
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{children}</>;
}

interface PrivateRouteProps {
	children: ReactChild;
}

export default PrivateRoute;
