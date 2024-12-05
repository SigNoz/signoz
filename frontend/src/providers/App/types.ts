import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { PayloadProps as LicensesResModel } from 'types/api/licenses/getAll';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';
import { PayloadProps as User } from 'types/api/user/getUser';

export interface IAppContext {
	user: IUser;
	isFetchingUser: boolean;
	userFetchError: unknown;
	licenses: LicensesResModel | null;
	isFetchingLicenses: boolean;
	licensesFetchError: unknown;
	activeLicenseV3: LicenseV3ResModel | null;
	isFetchingActiveLicenseV3: boolean;
	activeLicenseV3FetchError: unknown;
	featureFlags: FeatureFlags[] | null;
	isFetchingFeatureFlags: boolean;
	featureFlagsFetchError: unknown;
}

// User
export interface IUser extends User {
	accessJwt: string;
	refreshJwt: string;
}
