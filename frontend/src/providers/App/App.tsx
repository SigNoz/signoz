import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	PropsWithChildren,
	useCallback,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQuery, useQueryClient } from 'react-query';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import type { GetMyUser200 } from 'api/generated/services/sigNoz.schemas';
import { useGetHosts } from 'api/generated/services/zeus';
import {
	getGetGlobalConfigQueryKey,
	useGetGlobalConfig,
} from 'api/generated/services/global';
import { getGetActiveLicenseQueryKey } from 'api/generated/services/licenses';
import {
	getGetMyUserQueryKey,
	useGetMyUser,
} from 'api/generated/services/users';
import listOrgPreferences from 'api/v1/org/preferences/list';
import { clearAuthStorage } from 'utils/clearAuthStorage';
import { getIsNoAuthMode, setNoAuthMode } from 'utils/noAuthMode';
import listUserPreferences from 'api/v1/user/preferences/list';
import getUserVersion from 'api/v1/version/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import dayjs from 'dayjs';
import useActiveLicense from 'hooks/useActiveLicense/useActiveLicense';
import {
	IsAdminPermission,
	IsEditorPermission,
	IsViewerPermission,
} from 'lib/authz/hooks/useAuthZ/legacy';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useGetFeatureFlag } from 'hooks/useGetFeatureFlag';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
import { SuccessResponseV2 } from 'types/api';
import { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import {
	LicensePlatform,
	LicenseResModel,
	LicenseState,
	TrialInfo,
} from 'types/api/licensesV3/getActive';
import {
	OrgPreference,
	UserPreference,
} from 'types/api/preferences/preference';
import { Organization } from 'types/api/user/getOrganization';
import { UserResponse } from 'types/api/user/getUser';
import { ROLES, USER_ROLES } from 'types/roles';
import { toISOString } from 'utils/app';
import { setSigNozInstanceUrl } from 'utils/signozInstanceUrl';

import { IAppContext, IUser } from './types';
import { getUserDefaults } from './utils';

export const AppContext = createContext<IAppContext | undefined>(undefined);

type MyUser = GetMyUser200['data'];

const USER_PREFERENCES_QUERY_KEY = ['getAllUserPreferences', 'app-context'];
const ORG_PREFERENCES_QUERY_KEY = ['getOrgPreferences', 'app-context'];

function withUserData(prev: IUser, data: MyUser): IUser {
	return {
		...prev,
		id: data.id,
		displayName: data.displayName ?? prev.displayName,
		email: data.email ?? prev.email,
		orgId: data.orgId ?? prev.orgId,
		isRoot: data.isRoot,
		status: data.status as UserResponse['status'],
		createdAt: toISOString(data.createdAt) ?? prev.createdAt,
		updatedAt: toISOString(data.updatedAt) ?? prev.updatedAt,
	};
}

function toTrialInfo(license: LicenseResModel): TrialInfo {
	const freeUntilUnix = dayjs(license.freeUntil).unix();
	const scheduledAtUnix = dayjs(license.eventQueue.scheduledAt).unix();

	return {
		trialStart: license.validFrom,
		trialEnd: freeUntilUnix > 0 ? freeUntilUnix : dayjs().unix(),
		onTrial: dayjs(license.freeUntil).isAfter(dayjs()),
		workSpaceBlock:
			license.state === LicenseState.EVALUATION_EXPIRED &&
			license.platform === LicensePlatform.CLOUD,
		trialConvertedToSubscription:
			license.state !== LicenseState.ISSUED &&
			license.state !== LicenseState.EVALUATING &&
			license.state !== LicenseState.EVALUATION_EXPIRED,
		gracePeriodEnd: scheduledAtUnix > 0 ? scheduledAtUnix : dayjs().unix(),
	};
}

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	const queryClient = useQueryClient();
	// Seeded from the cache restored by lib/bootQueryCache, so the first render
	// already has the session and the shell does not wait on the refetch.
	const [restored] = useState(() => ({
		user: queryClient.getQueryData<GetMyUser200>(getGetMyUserQueryKey())?.data,
		license:
			queryClient.getQueryData<LicenseResModel>(getGetActiveLicenseQueryKey()) ??
			null,
		featureFlags:
			queryClient.getQueryData<SuccessResponseV2<FeatureFlags[]>>([
				REACT_QUERY_KEY.GET_FEATURES_FLAGS,
			])?.data ?? null,
		userPreferences:
			queryClient.getQueryData<{ data: UserPreference[] }>(
				USER_PREFERENCES_QUERY_KEY,
			)?.data ?? null,
		orgPreferences:
			queryClient.getQueryData<{ data: OrgPreference[] }>(
				ORG_PREFERENCES_QUERY_KEY,
			)?.data ?? null,
	}));

	// on load of the provider set the user defaults with access token , refresh token from local storage
	const [defaultUser, setDefaultUser] = useState<IUser>(() =>
		restored.user
			? withUserData(getUserDefaults(), restored.user)
			: getUserDefaults(),
	);
	const [activeLicense, setActiveLicense] = useState<LicenseResModel | null>(
		restored.license,
	);
	const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(() =>
		restored.license ? toTrialInfo(restored.license) : null,
	);
	const [featureFlags, setFeatureFlags] = useState<FeatureFlags[] | null>(
		restored.featureFlags,
	);
	const [orgPreferences, setOrgPreferences] = useState<OrgPreference[] | null>(
		restored.orgPreferences,
	);

	const [userPreferences, setUserPreferences] = useState<
		UserPreference[] | null
	>(restored.userPreferences);

	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
		(): boolean => getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true',
	);
	const [isPreflightLoading, setIsPreflightLoading] = useState<boolean>(
		() => !queryClient.getQueryData(getGetGlobalConfigQueryKey()),
	);
	const [org, setOrg] = useState<Organization[] | null>(() =>
		restored.user?.orgId
			? ([{ createdAt: 0, id: restored.user.orgId }] as Organization[])
			: null,
	);
	const [changelog, setChangelog] = useState<ChangelogSchema | null>(null);

	const [showChangelogModal, setShowChangelogModal] = useState<boolean>(false);

	// Pre-flight: discover auth mode from public global config.
	// On success: in impersonation mode → clear stale tokens, force isLoggedIn=true,
	//             set noAuthMode singleton so the axios interceptor (outside React)
	//             can skip the rotate-logout chain.
	// On failure: fail-safe to normal auth flow (treat as not no-auth).
	const { data: globalConfigData, isLoading: isFetchingGlobalConfig } =
		useGetGlobalConfig({
			query: {
				retry: 2,
				retryDelay: 1000,
				refetchOnWindowFocus: false,
				staleTime: Infinity,
			},
		});

	useEffect(() => {
		if (isFetchingGlobalConfig) {
			return;
		}

		const impersonationEnabled =
			globalConfigData?.data?.identN?.impersonation?.enabled === true;

		if (impersonationEnabled) {
			clearAuthStorage();
			setDefaultUser(getUserDefaults());
			setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
			setNoAuthMode(true);
			setIsLoggedIn(true);
		} else {
			setNoAuthMode(false);
		}

		setIsPreflightLoading(false);
	}, [globalConfigData, isFetchingGlobalConfig]);

	// fetcher for current user
	// user will only be fetched if the user id and token is present
	// if logged out and trying to hit any route none of these calls will trigger
	const {
		data: userData,
		isFetching: isFetchingUserData,
		error: userFetchDataError,
	} = useGetMyUser({
		query: { enabled: isLoggedIn },
	});

	const {
		permissions: permissionsResult,
		isFetching: isFetchingPermissions,
		refetchPermissions,
	} = useAuthZ([IsAdminPermission, IsEditorPermission, IsViewerPermission], {
		enabled: isLoggedIn,
	});

	// Restored data counts as loaded: the refetch behind it should not hold the shell.
	const isFetchingUser =
		(isFetchingUserData && !userData) ||
		(isFetchingPermissions && !permissionsResult);
	const userFetchError = userFetchDataError;

	const userRole = useMemo(() => {
		if (permissionsResult?.[IsAdminPermission]?.isGranted) {
			return USER_ROLES.ADMIN;
		}
		if (permissionsResult?.[IsEditorPermission]?.isGranted) {
			return USER_ROLES.EDITOR;
		}
		if (permissionsResult?.[IsViewerPermission]?.isGranted) {
			return USER_ROLES.VIEWER;
		}
		// if none of the permissions, so anonymous
		return USER_ROLES.ANONYMOUS;
	}, [permissionsResult]);

	const user: IUser = useMemo(() => {
		return {
			...defaultUser,
			role: userRole as ROLES,
		};
	}, [defaultUser, userRole]);

	useEffect(() => {
		if (userData?.data) {
			setLocalStorageApi(
				LOCALSTORAGE.LOGGED_IN_USER_EMAIL,
				userData.data.email ?? '',
			);
			setDefaultUser((prev) => withUserData(prev, userData.data));

			// todo: we need to update the org name as well, we should have the [admin only role restriction on the get org api call] - BE input needed
			setOrg((prev): any => {
				if (!prev) {
					return [
						{
							createdAt: 0,
							id: userData.data.orgId,
						},
					];
				}
				const orgIndex = prev.findIndex((e) => e.id === userData.data.orgId);

				if (orgIndex === -1) {
					return [
						...prev,
						{
							createdAt: 0,
							id: userData.data.orgId,
						},
					];
				}

				return [
					...prev.slice(0, orgIndex),
					{
						createdAt: 0,
						id: userData.data.orgId,
					},
					...prev.slice(orgIndex + 1),
				];
			});
		}
	}, [userData]);

	// fetcher for the active license
	const {
		data: activeLicenseData,
		isFetching: isFetchingActiveLicenseQuery,
		error: activeLicenseFetchError,
		refetch: activeLicenseRefetch,
	} = useActiveLicense(isLoggedIn);
	const isFetchingActiveLicense =
		isFetchingActiveLicenseQuery && !activeLicenseData;
	useEffect(() => {
		if (activeLicenseData) {
			setActiveLicense(activeLicenseData);
			setTrialInfo(toTrialInfo(activeLicenseData));
		}
	}, [activeLicenseData]);

	const isCloudUser = activeLicense?.platform === LicensePlatform.CLOUD;

	const {
		data: hostsResponse,
		isFetching: isFetchingHosts,
		error: hostsFetchError,
	} = useGetHosts({
		query: { enabled: isLoggedIn && isCloudUser },
	});

	const hostsData = useMemo(() => hostsResponse ?? null, [hostsResponse]);

	useEffect(() => {
		const hosts = hostsData?.data?.hosts ?? [];
		if (hosts.length === 0) {
			return;
		}
		const activeHost =
			hosts.find((h) => !h.is_default) ?? hosts.find((h) => h.is_default);
		setSigNozInstanceUrl(activeHost?.url);
	}, [hostsData]);

	// fetcher for feature flags
	const {
		data: featureFlagsData,
		isFetching: isFetchingFeatureFlagsQuery,
		error: featureFlagsFetchError,
	} = useGetFeatureFlag((allFlags: FeatureFlags[]) => {
		setFeatureFlags(allFlags);
	}, isLoggedIn);
	const isFetchingFeatureFlags =
		isFetchingFeatureFlagsQuery && !featureFlagsData;

	// onSuccess does not run for data restored from the persisted cache.
	useEffect(() => {
		if (featureFlagsData?.data) {
			setFeatureFlags(featureFlagsData.data);
		}
	}, [featureFlagsData]);

	// now since org preferences data is dependent on user being loaded as well so we added extra safety net for user.email to be set as well
	const {
		data: orgPreferencesData,
		isFetching: isFetchingOrgPreferencesQuery,
		error: orgPreferencesFetchError,
	} = useQuery({
		queryFn: () => listOrgPreferences(),
		queryKey: ORG_PREFERENCES_QUERY_KEY,
		enabled: !!isLoggedIn && !!user.email && user.role === USER_ROLES.ADMIN,
	});

	const isFetchingOrgPreferences =
		isFetchingOrgPreferencesQuery && !orgPreferencesData;

	useEffect(() => {
		if (orgPreferencesData?.data) {
			setOrgPreferences(orgPreferencesData.data);
		}
	}, [orgPreferencesData]);

	const {
		data: userPreferencesData,
		isFetching: isFetchingUserPreferencesQuery,
		isIdle: isUserPreferencesQueryIdle,
	} = useQuery({
		queryFn: () => listUserPreferences(),
		queryKey: USER_PREFERENCES_QUERY_KEY,
		enabled: !!isLoggedIn,
	});

	useEffect(() => {
		if (userPreferencesData?.data) {
			setUserPreferences(userPreferencesData.data);
		}
	}, [userPreferencesData, isLoggedIn]);

	// Idle means logged out.
	const isFetchingUserPreferences =
		(isFetchingUserPreferencesQuery && !userPreferencesData) ||
		(isUserPreferencesQueryIdle && !userFetchError) ||
		(!!userPreferencesData?.data && userPreferences === null);

	// The last clause covers the gap between the fetches settling and their data
	// landing in state.
	const isSessionPending =
		isLoggedIn &&
		(isPreflightLoading ||
			isFetchingActiveLicense ||
			isFetchingUser ||
			isFetchingFeatureFlags ||
			((!activeLicense || !user.email || !featureFlags) &&
				!userFetchError &&
				!activeLicenseFetchError));

	// Held back so the boot calls fit the six connections a browser opens to one
	// host over HTTP/1.1: a seventh queues the role check the page waits for.
	const { data: versionData } = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: isLoggedIn && !isSessionPending,
	});

	function updateUser(user: IUser): void {
		setDefaultUser((prev) => ({
			...prev,
			...user,
		}));
	}

	const updateUserPreferenceInContext = useCallback(
		(userPreference: UserPreference): void => {
			setUserPreferences((prev) => {
				const index = prev?.findIndex((e) => e.name === userPreference.name);
				if (index !== undefined) {
					return [
						...(prev?.slice(0, index) || []),
						userPreference,
						...(prev?.slice(index + 1, prev.length) || []),
					];
				}
				return prev;
			});
		},
		[],
	);

	function updateOrgPreferences(orgPreferences: OrgPreference[]): void {
		setOrgPreferences(orgPreferences);
	}

	const updateOrg = useCallback(
		(orgId: string, updatedOrgName: string): void => {
			if (org && org.length > 0) {
				const orgIndex = org.findIndex((e) => e.id === orgId);
				if (orgIndex === -1) {
					return;
				}
				const updatedOrg: Organization[] = [
					...org.slice(0, orgIndex),
					{
						createdAt: 0,
						id: orgId,
						displayName: updatedOrgName,
					},
					...org.slice(orgIndex + 1),
				];
				setOrg(updatedOrg);
				setDefaultUser((prev) => {
					if (prev.orgId === orgId) {
						return {
							...prev,
							organization: updatedOrgName,
						};
					}
					return prev;
				});
			}
		},
		[org],
	);

	const updateChangelog = useCallback(
		(payload: ChangelogSchema): void => {
			setChangelog(payload);
		},
		[setChangelog],
	);

	const toggleChangelogModal = useCallback(() => {
		setShowChangelogModal((prev) => !prev);
	}, []);

	// global event listener for AFTER_LOGIN event to start the user fetch post all actions are complete
	useGlobalEventListener('AFTER_LOGIN', (event) => {
		if (event.detail) {
			setDefaultUser((prev) => ({
				...prev,
				accessJwt: event.detail.accessJWT,
				refreshJwt: event.detail.refreshJWT,
				id: event.detail.id,
			}));
			setIsLoggedIn(true);
		}

		refetchPermissions();
	});

	// global event listener for LOGOUT event to clean the app context state
	useGlobalEventListener('LOGOUT', () => {
		if (getIsNoAuthMode()) {
			return;
		} // logout is meaningless in no-auth; defensively no-op
		setIsLoggedIn(false);
		setDefaultUser(getUserDefaults());
		setActiveLicense(null);
		setTrialInfo(null);
		setFeatureFlags(null);
		setOrgPreferences(null);
		setOrg(null);
	});

	// return value for the context
	const value: IAppContext = useMemo(
		() => ({
			user,
			userPreferences,
			featureFlags,
			trialInfo,
			orgPreferences,
			hostsData,
			isLoggedIn,
			isPreflightLoading,
			isSessionPending,
			org,
			isFetchingUser,
			isFetchingActiveLicense,
			isFetchingHosts,
			isFetchingFeatureFlags,
			isFetchingOrgPreferences,
			isFetchingUserPreferences,
			userFetchError,
			activeLicenseFetchError,
			hostsFetchError,
			featureFlagsFetchError,
			orgPreferencesFetchError,
			activeLicense,
			changelog,
			showChangelogModal,
			activeLicenseRefetch,
			updateUser,
			updateOrgPreferences,
			updateUserPreferenceInContext,
			updateOrg,
			updateChangelog,
			toggleChangelogModal,
			versionData: versionData?.data || null,
			hasEditPermission:
				user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.EDITOR,
		}),
		[
			trialInfo,
			activeLicense,
			activeLicenseFetchError,
			userPreferences,
			featureFlags,
			featureFlagsFetchError,
			isFetchingActiveLicense,
			isFetchingHosts,
			isFetchingFeatureFlags,
			isFetchingOrgPreferences,
			isFetchingUserPreferences,
			isFetchingUser,
			isLoggedIn,
			hostsData,
			hostsFetchError,
			isPreflightLoading,
			isSessionPending,
			org,
			orgPreferences,
			activeLicenseRefetch,
			orgPreferencesFetchError,
			changelog,
			showChangelogModal,
			updateUserPreferenceInContext,
			updateOrg,
			updateChangelog,
			toggleChangelogModal,
			user,
			userFetchError,
			versionData,
		],
	);
	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = (): IAppContext => {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error('useAppContext must be used within an AppProvider');
	}
	return context;
};
