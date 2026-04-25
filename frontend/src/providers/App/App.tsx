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
import { useQuery } from 'react-query';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { useGetMyUser } from 'api/generated/services/users';
import listOrgPreferences from 'api/v1/org/preferences/list';
import listUserPreferences from 'api/v1/user/preferences/list';
import getUserVersion from 'api/v1/version/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import dayjs from 'dayjs';
import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import {
	IsAdminPermission,
	IsEditorPermission,
	IsViewerPermission,
} from 'hooks/useAuthZ/legacy';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { useGetFeatureFlag } from 'hooks/useGetFeatureFlag';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
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

import { IAppContext, IUser } from './types';
import { getUserDefaults } from './utils';

export const AppContext = createContext<IAppContext | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	// on load of the provider set the user defaults with access token , refresh token from local storage
	const [defaultUser, setDefaultUser] = useState<IUser>(() => getUserDefaults());
	const [activeLicense, setActiveLicense] = useState<LicenseResModel | null>(
		null,
	);
	const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
	const [featureFlags, setFeatureFlags] = useState<FeatureFlags[] | null>(null);
	const [orgPreferences, setOrgPreferences] = useState<OrgPreference[] | null>(
		null,
	);

	const [userPreferences, setUserPreferences] = useState<
		UserPreference[] | null
	>(null);

	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
		(): boolean => getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true',
	);
	const [org, setOrg] = useState<Organization[] | null>(null);
	const [changelog, setChangelog] = useState<ChangelogSchema | null>(null);

	const [showChangelogModal, setShowChangelogModal] = useState<boolean>(false);

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
		error: errorOnPermissions,
		refetchPermissions,
	} = useAuthZ([IsAdminPermission, IsEditorPermission, IsViewerPermission], {
		enabled: isLoggedIn,
	});

	const isFetchingUser = isFetchingUserData || isFetchingPermissions;
	const userFetchError = userFetchDataError || errorOnPermissions;

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
		if (!isFetchingUserData && userData?.data) {
			setLocalStorageApi(
				LOCALSTORAGE.LOGGED_IN_USER_EMAIL,
				userData.data.email ?? '',
			);
			setDefaultUser((prev) => ({
				...prev,
				id: userData.data.id,
				displayName: userData.data.displayName ?? prev.displayName,
				email: userData.data.email ?? prev.email,
				orgId: userData.data.orgId ?? prev.orgId,
				isRoot: userData.data.isRoot,
				status: userData.data.status as UserResponse['status'],
				createdAt: toISOString(userData.data.createdAt) ?? prev.createdAt,
				updatedAt: toISOString(userData.data.updatedAt) ?? prev.updatedAt,
			}));

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
	}, [userData, isFetchingUserData]);

	// fetcher for licenses v3
	const {
		data: activeLicenseData,
		isFetching: isFetchingActiveLicense,
		error: activeLicenseFetchError,
		refetch: activeLicenseRefetch,
	} = useActiveLicenseV3(isLoggedIn);
	useEffect(() => {
		if (!isFetchingActiveLicense && activeLicenseData && activeLicenseData.data) {
			setActiveLicense(activeLicenseData.data);

			const isOnTrial = dayjs(
				activeLicenseData.data.free_until || Date.now(),
			).isAfter(dayjs());

			const trialInfo: TrialInfo = {
				trialStart: activeLicenseData.data.valid_from,
				trialEnd: dayjs(activeLicenseData.data.free_until || Date.now()).unix(),
				onTrial: isOnTrial,
				workSpaceBlock:
					activeLicenseData.data.state === LicenseState.EVALUATION_EXPIRED &&
					activeLicenseData.data.platform === LicensePlatform.CLOUD,
				trialConvertedToSubscription:
					activeLicenseData.data.state !== LicenseState.ISSUED &&
					activeLicenseData.data.state !== LicenseState.EVALUATING &&
					activeLicenseData.data.state !== LicenseState.EVALUATION_EXPIRED,
				gracePeriodEnd: dayjs(
					activeLicenseData.data.event_queue.scheduled_at || Date.now(),
				).unix(),
			};

			setTrialInfo(trialInfo);
		}
	}, [activeLicenseData, isFetchingActiveLicense]);

	// fetcher for feature flags
	const { isFetching: isFetchingFeatureFlags, error: featureFlagsFetchError } =
		useGetFeatureFlag((allFlags: FeatureFlags[]) => {
			setFeatureFlags(allFlags);
		}, isLoggedIn);

	// now since org preferences data is dependent on user being loaded as well so we added extra safety net for user.email to be set as well
	const {
		data: orgPreferencesData,
		isFetching: isFetchingOrgPreferences,
		error: orgPreferencesFetchError,
	} = useQuery({
		queryFn: () => listOrgPreferences(),
		queryKey: ['getOrgPreferences', 'app-context'],
		enabled: !!isLoggedIn && !!user.email && user.role === USER_ROLES.ADMIN,
	});

	const { data: versionData } = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: isLoggedIn,
	});

	useEffect(() => {
		if (
			!isFetchingOrgPreferences &&
			orgPreferencesData &&
			orgPreferencesData.data
		) {
			setOrgPreferences(orgPreferencesData.data);
		}
	}, [orgPreferencesData, isFetchingOrgPreferences]);

	// now since org preferences data is dependent on user being loaded as well so we added extra safety net for user.email to be set as well
	const { data: userPreferencesData, isFetching: isFetchingUserPreferences } =
		useQuery({
			queryFn: () => listUserPreferences(),
			queryKey: ['getAllUserPreferences', 'app-context'],
			enabled: !!isLoggedIn && !!user.email,
		});

	useEffect(() => {
		if (
			userPreferencesData &&
			userPreferencesData.data &&
			!isFetchingUserPreferences
		) {
			setUserPreferences(userPreferencesData.data);
		}
	}, [userPreferencesData, isFetchingUserPreferences, isLoggedIn]);

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
			isLoggedIn,
			org,
			isFetchingUser,
			isFetchingActiveLicense,
			isFetchingFeatureFlags,
			isFetchingOrgPreferences,
			userFetchError,
			activeLicenseFetchError,
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
			isFetchingFeatureFlags,
			isFetchingOrgPreferences,
			isFetchingUser,
			isLoggedIn,
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
