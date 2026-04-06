import { ReactChild, useCallback, useMemo } from 'react';
import { matchPath, Redirect, useLocation } from 'react-router-dom';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { useListUsers } from 'api/generated/services/users';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';
import { OrgPreference } from 'types/api/preferences/preference';
import { USER_ROLES } from 'types/roles';
import { routePermission } from 'utils/permission';

import routes, {
	LIST_LICENSES,
	oldNewRoutesMapping,
	oldRoutes,
	ROUTES_NOT_TO_BE_OVERRIDEN,
	SUPPORT_ROUTE,
} from './routes';

// eslint-disable-next-line sonarjs/cognitive-complexity
function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const location = useLocation();
	const { pathname } = location;
	const {
		org,
		orgPreferences,
		user,
		isLoggedIn: isLoggedInState,
		isFetchingOrgPreferences,
		activeLicense,
		isFetchingActiveLicense,
		trialInfo,
		featureFlags,
	} = useAppContext();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const mapRoutes = useMemo(
		() =>
			new Map(
				[...routes, LIST_LICENSES, SUPPORT_ROUTE].map((e) => {
					const currentPath = matchPath(pathname, {
						path: e.path,
					});
					return [currentPath === null ? null : 'current', e];
				}),
			),
		[pathname],
	);
	const isOldRoute = oldRoutes.indexOf(pathname) > -1;
	const currentRoute = mapRoutes.get('current');
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const orgData = useMemo(() => {
		if (org && org.length > 0 && org[0].id !== undefined) {
			return org[0];
		}
		return undefined;
	}, [org]);

	const { data: usersData, isFetching: isFetchingUsers } = useListUsers({
		query: {
			enabled: !isEmpty(orgData) && user.role === 'ADMIN',
		},
	});

	const checkFirstTimeUser = useCallback((): boolean => {
		const users = usersData?.data || [];

		const remainingUsers = (Array.isArray(users) ? users : []).filter(
			(user) => user.email !== 'admin@signoz.cloud',
		);

		return remainingUsers.length === 1;
	}, [usersData?.data]);

	// Handle old routes - redirect to new routes
	if (isOldRoute) {
		const redirectUrl = oldNewRoutesMapping[pathname];
		return (
			<Redirect
				to={{
					pathname: redirectUrl,
					search: location.search,
					hash: location.hash,
				}}
			/>
		);
	}

	// Public dashboard - no redirect needed
	const isPublicDashboard = currentRoute?.path === ROUTES.PUBLIC_DASHBOARD;
	if (isPublicDashboard) {
		return <>{children}</>;
	}

	// Check for workspace access restriction (cloud only)
	const isCloudPlatform = activeLicense?.platform === LicensePlatform.CLOUD;

	if (!isFetchingActiveLicense && activeLicense && isCloudPlatform) {
		const isTerminated = activeLicense.state === LicenseState.TERMINATED;
		const isExpired = activeLicense.state === LicenseState.EXPIRED;
		const isCancelled = activeLicense.state === LicenseState.CANCELLED;
		const isWorkspaceAccessRestricted = isTerminated || isExpired || isCancelled;

		if (
			isWorkspaceAccessRestricted &&
			pathname !== ROUTES.WORKSPACE_ACCESS_RESTRICTED
		) {
			return <Redirect to={ROUTES.WORKSPACE_ACCESS_RESTRICTED} />;
		}

		// Check for workspace suspended (DEFAULTED)
		const shouldSuspendWorkspace = activeLicense.state === LicenseState.DEFAULTED;
		if (shouldSuspendWorkspace && pathname !== ROUTES.WORKSPACE_SUSPENDED) {
			return <Redirect to={ROUTES.WORKSPACE_SUSPENDED} />;
		}
	}

	// Check for workspace blocked (trial expired)
	if (!isFetchingActiveLicense && isCloudPlatform && trialInfo?.workSpaceBlock) {
		const isRouteEnabledForWorkspaceBlockedState =
			isAdmin &&
			(pathname === ROUTES.SETTINGS ||
				pathname === ROUTES.ORG_SETTINGS ||
				pathname === ROUTES.MEMBERS_SETTINGS ||
				pathname === ROUTES.BILLING ||
				pathname === ROUTES.MY_SETTINGS);

		if (
			pathname !== ROUTES.WORKSPACE_LOCKED &&
			!isRouteEnabledForWorkspaceBlockedState
		) {
			return <Redirect to={ROUTES.WORKSPACE_LOCKED} />;
		}
	}

	// Check for onboarding redirect (cloud users, first user, onboarding not complete)
	if (
		isCloudUserVal &&
		!isFetchingOrgPreferences &&
		orgPreferences &&
		!isFetchingUsers &&
		usersData &&
		usersData.data
	) {
		const isOnboardingComplete = orgPreferences?.find(
			(preference: OrgPreference) =>
				preference.name === ORG_PREFERENCES.ORG_ONBOARDING,
		)?.value;

		// Don't redirect to onboarding if workspace has issues
		const isWorkspaceBlocked = trialInfo?.workSpaceBlock;
		const isWorkspaceSuspended = activeLicense?.state === LicenseState.DEFAULTED;
		const isWorkspaceAccessRestricted =
			activeLicense?.state === LicenseState.TERMINATED ||
			activeLicense?.state === LicenseState.EXPIRED ||
			activeLicense?.state === LicenseState.CANCELLED;

		const hasWorkspaceIssue =
			isWorkspaceBlocked || isWorkspaceSuspended || isWorkspaceAccessRestricted;

		if (!hasWorkspaceIssue) {
			const isFirstUser = checkFirstTimeUser();
			if (
				isFirstUser &&
				!isOnboardingComplete &&
				!ROUTES_NOT_TO_BE_OVERRIDEN.includes(pathname) &&
				pathname !== ROUTES.ONBOARDING
			) {
				return <Redirect to={ROUTES.ONBOARDING} />;
			}
		}
	}

	// Check for GET_STARTED → GET_STARTED_WITH_CLOUD redirect (feature flag)
	if (
		currentRoute?.path === ROUTES.GET_STARTED &&
		featureFlags?.find((e) => e.name === FeatureKeys.ONBOARDING_V3)?.active
	) {
		return <Redirect to={ROUTES.GET_STARTED_WITH_CLOUD} />;
	}

	// Main routing logic
	if (currentRoute) {
		const { isPrivate, key } = currentRoute;
		if (isPrivate) {
			if (isLoggedInState) {
				const route = routePermission[key];
				if (route && route.find((e) => e === user.role) === undefined) {
					return <Redirect to={ROUTES.UN_AUTHORIZED} />;
				}
			} else {
				// Save current path and redirect to login
				setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, pathname);
				return <Redirect to={ROUTES.LOGIN} />;
			}
		} else if (isLoggedInState) {
			// Non-private route, but user is logged in
			const fromPathname = getLocalStorageApi(
				LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT,
			);
			if (fromPathname) {
				setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, '');
				return <Redirect to={fromPathname} />;
			}
			if (pathname !== ROUTES.SOMETHING_WENT_WRONG) {
				return <Redirect to={ROUTES.HOME} />;
			}
		}
		// Non-private route, user not logged in - let login/signup pages handle it
	} else if (isLoggedInState) {
		// Unknown route, logged in
		const fromPathname = getLocalStorageApi(
			LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT,
		);
		if (fromPathname) {
			setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, '');
			return <Redirect to={fromPathname} />;
		}
		return <Redirect to={ROUTES.HOME} />;
	} else {
		// Unknown route, not logged in
		setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, pathname);
		return <Redirect to={ROUTES.LOGIN} />;
	}

	return <>{children}</>;
}

interface PrivateRouteProps {
	children: ReactChild;
}

export default PrivateRoute;
