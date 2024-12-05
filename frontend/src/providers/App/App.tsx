import setLocalStorageApi from 'api/browser/localstorage/set';
import getAllOrgPreferences from 'api/preferences/getAllOrgPreferences';
import { Logout } from 'api/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
import useLicense from 'hooks/useLicense';
import useGetUser from 'hooks/user/useGetUser';
import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { PayloadProps as LicensesResModel } from 'types/api/licenses/getAll';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';
import { Organization } from 'types/api/user/getOrganization';
import { OrgPreference } from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import { IAppContext, IUser } from './types';
import { getUserDefaults } from './utils';

const AppContext = createContext<IAppContext | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	const [user, setUser] = useState<IUser>(() => getUserDefaults());
	const [licenses, setLicenses] = useState<LicensesResModel | null>(null);
	const [
		activeLicenseV3,
		setActiveLicenseV3,
	] = useState<LicenseV3ResModel | null>(null);
	const [featureFlags, setFeatureFlags] = useState<FeatureFlags[] | null>(null);
	const [orgPreferences, setOrgPreferences] = useState<OrgPreference[] | null>(
		null,
	);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [org, setOrg] = useState<Organization[] | null>(null);

	// fetcher for user
	const {
		data: userData,
		isFetching: isFetchingUser,
		error: userFetchError,
	} = useGetUser(user.id, user.accessJwt);
	useEffect(() => {
		if (userData && userData.payload) {
			setUser((prev) => ({
				...prev,
				...userData.payload,
			}));
			setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
			setIsLoggedIn(true);
			setOrg((prev) => {
				if (!prev) {
					return [
						{
							createdAt: 0,
							hasOptedUpdates: false,
							id: userData.payload.orgId,
							isAnonymous: false,
							name: userData.payload.organization,
						},
					];
				}
				const orgIndex = prev.findIndex((e) => e.id === userData.payload.orgId);

				const updatedOrg: Organization[] = [
					...prev.slice(0, orgIndex),
					{
						createdAt: 0,
						hasOptedUpdates: false,
						id: userData.payload.orgId,
						isAnonymous: false,
						name: userData.payload.organization,
					},
					...prev.slice(orgIndex + 1, prev.length),
				];

				return updatedOrg;
			});
		}
	}, [userData]);

	useEffect(() => {
		if (userFetchError) {
			Logout();
		}
	}, [userFetchError]);

	// fetcher for licenses v2
	const {
		data: licenseData,
		isFetching: isFetchingLicenses,
		error: licensesFetchError,
	} = useLicense(user.email);
	useEffect(() => {
		if (licenseData && licenseData.payload) {
			setLicenses(licenseData.payload);
		}
	}, [licenseData]);

	// fetcher for licenses v3
	const {
		data: activeLicenseV3Data,
		isFetching: isFetchingActiveLicenseV3,
		error: activeLicenseV3FetchError,
	} = useActiveLicenseV3(user.email);
	useEffect(() => {
		if (activeLicenseV3Data && activeLicenseV3Data.payload) {
			setActiveLicenseV3(activeLicenseV3Data.payload);
		}
	}, [activeLicenseV3Data]);

	// fetcher for feature flags
	const {
		isFetching: isFetchingFeatureFlags,
		error: featureFlagsFetchError,
	} = useGetFeatureFlag((allFlags: FeatureFlags[]) => {
		setFeatureFlags(allFlags);
	}, user.email);

	const {
		data: orgPreferencesData,
		isFetching: isFetchingOrgPreferences,
		error: orgPreferencesFetchError,
	} = useQuery({
		queryFn: () => getAllOrgPreferences(),
		queryKey: ['getOrgPreferences'],
		enabled: !!user.email && user.role === USER_ROLES.ADMIN,
	});

	useEffect(() => {
		if (orgPreferencesData && orgPreferencesData.payload) {
			setOrgPreferences(orgPreferencesData.payload.data);
		}
	}, [orgPreferencesData]);

	// global event listener for AFTER_LOGIN event to start the user fetch post all actions are complete
	useGlobalEventListener('AFTER_LOGIN', (event) => {
		if (event.detail) {
			setUser((prev) => ({
				...prev,
				accessJwt: event.detail.accessJWT,
				refreshJwt: event.detail.refreshJWT,
				id: event.detail.id,
			}));
		}
	});

	useGlobalEventListener('LOGOUT', () => {
		setIsLoggedIn(false);
		setUser(getUserDefaults());
		setActiveLicenseV3(null);
		setLicenses(null);
		setFeatureFlags(null);
		setOrgPreferences(null);
		setOrg(null);
	});

	// return value for the context
	const value: IAppContext = useMemo(
		() => ({
			activeLicenseV3,
			isFetchingActiveLicenseV3,
			activeLicenseV3FetchError,
			user,
			org,
			isFetchingUser,
			userFetchError,
			licenses,
			isFetchingLicenses,
			licensesFetchError,
			featureFlags,
			isFetchingFeatureFlags,
			featureFlagsFetchError,
			orgPreferences,
			isFetchingOrgPreferences,
			orgPreferencesFetchError,
			isLoggedIn,
		}),
		[
			activeLicenseV3,
			activeLicenseV3FetchError,
			featureFlags,
			featureFlagsFetchError,
			isFetchingActiveLicenseV3,
			isFetchingFeatureFlags,
			isFetchingLicenses,
			isFetchingOrgPreferences,
			isFetchingUser,
			isLoggedIn,
			licenses,
			licensesFetchError,
			org,
			orgPreferences,
			orgPreferencesFetchError,
			user,
			userFetchError,
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
