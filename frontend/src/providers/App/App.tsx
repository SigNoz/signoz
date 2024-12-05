import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
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
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { PayloadProps as LicensesResModel } from 'types/api/licenses/getAll';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';

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

	// fetcher for user
	const {
		data: userData,
		isFetching: isFetchingUser,
		error: userFetchError,
	} = useGetUser(user.id);
	useEffect(() => {
		if (userData && userData.payload) {
			setUser((prev) => ({
				...prev,
				...userData.payload,
			}));
		}
	}, [userData]);

	// fetcher for licenses v2
	const {
		data: licenseData,
		isFetching: isFetchingLicenses,
		error: licensesFetchError,
	} = useLicense();
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
	} = useActiveLicenseV3();
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
	});

	// return value for the context
	const value: IAppContext = useMemo(
		() => ({
			activeLicenseV3,
			isFetchingActiveLicenseV3,
			activeLicenseV3FetchError,
			user,
			isFetchingUser,
			userFetchError,
			licenses,
			isFetchingLicenses,
			licensesFetchError,
			featureFlags,
			isFetchingFeatureFlags,
			featureFlagsFetchError,
		}),
		[
			activeLicenseV3,
			activeLicenseV3FetchError,
			featureFlags,
			featureFlagsFetchError,
			isFetchingActiveLicenseV3,
			isFetchingFeatureFlags,
			isFetchingLicenses,
			isFetchingUser,
			licenses,
			licensesFetchError,
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
