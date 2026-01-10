import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import listOrgPreferences from 'api/v1/org/preferences/list';
import get from 'api/v1/user/me/get';
import listUserPreferences from 'api/v1/user/preferences/list';
import getUserVersion from 'api/v1/version/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import dayjs from 'dayjs';
import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import { useGetFeatureFlag } from 'hooks/useGetFeatureFlag';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
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
import { USER_ROLES } from 'types/roles';

import { IAppContext, IUser } from './types';
import { getUserDefaults } from './utils';

export const AppContext = createContext<IAppContext | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	// on load of the provider set the user defaults with access token , refresh token from local storage
	const [user, setUser] = useState<IUser>(() => getUserDefaults());
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

	// fetcher for user
	// user will only be fetched if the user id and token is present
	// if logged out and trying to hit any route none of these calls will trigger
	const {
		data: userData,
		isFetching: isFetchingUser,
		error: userFetchError,
	} = useQuery({
		queryFn: get,
		queryKey: ['/api/v1/user/me'],
		enabled: isLoggedIn,
	});

	useEffect(() => {
		if (!isFetchingUser && userData && userData.data) {
			setLocalStorageApi(LOCALSTORAGE.LOGGED_IN_USER_EMAIL, userData.data.email);
			setUser((prev) => ({
				...prev,
				...userData.data,
			}));
			setOrg((prev) => {
				if (!prev) {
					// if no org is present enter a new entry
					return [
						{
							createdAt: 0,
							id: userData.data.orgId,
							displayName: userData.data.organization,
						},
					];
				}
				// else mutate the existing entry
				const orgIndex = prev.findIndex((e) => e.id === userData.data.orgId);
				const updatedOrg: Organization[] = [
					...prev.slice(0, orgIndex),
					{
						createdAt: 0,
						id: userData.data.orgId,
						displayName: userData.data.organization,
					},
					...prev.slice(orgIndex + 1, prev.length),
				];
				return updatedOrg;
			});
		}
	}, [userData, isFetchingUser]);

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
	const {
		isFetching: isFetchingFeatureFlags,
		error: featureFlagsFetchError,
	} = useGetFeatureFlag((allFlags: FeatureFlags[]) => {
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
	const {
		data: userPreferencesData,
		isFetching: isFetchingUserPreferences,
	} = useQuery({
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
		setUser((prev) => ({
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
				const updatedOrg: Organization[] = [
					...org.slice(0, orgIndex),
					{
						createdAt: 0,
						id: orgId,
						displayName: updatedOrgName,
					},
					...org.slice(orgIndex + 1, org.length),
				];
				setOrg(updatedOrg);
				setUser((prev) => {
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
			setUser((prev) => ({
				...prev,
				accessJwt: event.detail.accessJWT,
				refreshJwt: event.detail.refreshJWT,
				id: event.detail.id,
			}));
			setIsLoggedIn(true);
		}
	});

	// global event listener for LOGOUT event to clean the app context state
	useGlobalEventListener('LOGOUT', () => {
		setIsLoggedIn(false);
		setUser(getUserDefaults());
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
