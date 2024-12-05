/* eslint-disable react-hooks/exhaustive-deps */
import getOrgUser from 'api/user/getOrgUser';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { ReactChild, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { matchPath, useLocation } from 'react-router-dom';
import { LicenseState, LicenseStatus } from 'types/api/licensesV3/getActive';
import { Organization } from 'types/api/user/getOrganization';
import { isCloudUser } from 'utils/app';
import { routePermission } from 'utils/permission';

import routes, {
	LIST_LICENSES,
	oldNewRoutesMapping,
	oldRoutes,
} from './routes';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const location = useLocation();
	const { pathname } = location;
	const isCloudUserVal = isCloudUser();
	const {
		org,
		orgPreferences,
		user,
		isLoggedIn: isLoggedInState,
		isFetchingOrgPreferences,
		licenses,
		isFetchingLicenses,
		activeLicenseV3,
		isFetchingActiveLicenseV3,
	} = useAppContext();
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
	const currentRoute = mapRoutes.get('current');
	const isOldRoute = oldRoutes.indexOf(pathname) > -1;

	const [orgData, setOrgData] = useState<Organization | undefined>(undefined);

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
		if (!isFetchingOrgPreferences && orgPreferences) {
			const isOnboardingComplete = orgPreferences?.find(
				(preference: Record<string, any>) => preference.key === 'ORG_ONBOARDING',
			)?.value;

			// Only run this effect if the org users and preferences are loaded
			if (!isLoadingOrgUsers && !isFetchingOrgPreferences) {
				const isFirstUser = checkFirstTimeUser();

				// Redirect to get started if it's not the first user or if the onboarding is complete
				return isFirstUser && !isOnboardingComplete;
			}
		}
		return false;
	};

	const handlePrivateRoutes = async (
		key: keyof typeof ROUTES,
	): Promise<void> => {
		const route = routePermission[key];
		if (user && route && route.find((e) => e === user.role) === undefined) {
			history.push(ROUTES.UN_AUTHORIZED);
		}
	};

	const navigateToWorkSpaceBlocked = (route: any): void => {
		const { path } = route;

		if (path && path !== ROUTES.WORKSPACE_LOCKED) {
			history.push(ROUTES.WORKSPACE_LOCKED);
		}
	};

	useEffect(() => {
		if (!isFetchingLicenses) {
			const shouldBlockWorkspace = licenses?.workSpaceBlock;

			if (shouldBlockWorkspace) {
				navigateToWorkSpaceBlocked(currentRoute);
			}
		}
	}, [isFetchingLicenses]);

	const navigateToWorkSpaceSuspended = (route: any): void => {
		const { path } = route;

		if (path && path !== ROUTES.WORKSPACE_SUSPENDED) {
			history.push(ROUTES.WORKSPACE_SUSPENDED);
		}
	};

	useEffect(() => {
		if (!isFetchingActiveLicenseV3 && activeLicenseV3) {
			const shouldSuspendWorkspace =
				activeLicenseV3.status === LicenseStatus.SUSPENDED &&
				activeLicenseV3.state === LicenseState.PAYMENT_FAILED;

			if (shouldSuspendWorkspace) {
				navigateToWorkSpaceSuspended(currentRoute);
			}
		}
	}, [isFetchingActiveLicenseV3, activeLicenseV3]);

	useEffect(() => {
		if (org && org.length > 0 && org[0].id !== undefined) {
			setOrgData(org[0]);
		}
	}, [org]);

	const handleRouting = (): void => {
		const showOrgOnboarding = shouldShowOnboarding();

		if (showOrgOnboarding && isCloudUserVal) {
			history.push(ROUTES.ONBOARDING);
		} else {
			history.push(ROUTES.APPLICATION);
		}
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				// if it is an old route navigate to the new route
				if (isOldRoute) {
					const redirectUrl = oldNewRoutesMapping[pathname];

					const newLocation = {
						...location,
						pathname: redirectUrl,
					};
					history.replace(newLocation);
				}

				// if the current route
				if (currentRoute) {
					const { isPrivate, key } = currentRoute;

					if (
						isPrivate &&
						key !== String(ROUTES.WORKSPACE_LOCKED) &&
						key !== String(ROUTES.WORKSPACE_SUSPENDED)
					) {
						handlePrivateRoutes(key);
					} else {
						handleRouting();
					}
				} else {
					// routing to application page over root page
					handleRouting();
				}
			} catch (error) {
				// something went wrong
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();
	}, [isLoggedInState, currentRoute, licenses, orgUsers, orgPreferences]);

	// NOTE: disabling this rule as there is no need to have div
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{children}</>;
}

interface PrivateRouteProps {
	children: ReactChild;
}

export default PrivateRoute;
