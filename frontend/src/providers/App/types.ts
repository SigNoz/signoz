import APIError from 'types/api/error';
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { LicenseResModel, TrialInfo } from 'types/api/licensesV3/getActive';
import { Organization } from 'types/api/user/getOrganization';
import { UserResponse as User } from 'types/api/user/getUser';
import { PayloadProps } from 'types/api/user/getVersion';
import { OrgPreference } from 'types/reducer/app';

export interface IAppContext {
	user: IUser;
	activeLicense: LicenseResModel | null;
	trialInfo: TrialInfo | null;
	featureFlags: FeatureFlags[] | null;
	orgPreferences: OrgPreference[] | null;
	isLoggedIn: boolean;
	org: Organization[] | null;
	isFetchingUser: boolean;
	isFetchingActiveLicense: boolean;
	isFetchingFeatureFlags: boolean;
	isFetchingOrgPreferences: boolean;
	userFetchError: unknown;
	activeLicenseFetchError: APIError | null;
	featureFlagsFetchError: unknown;
	orgPreferencesFetchError: unknown;
	activeLicenseRefetch: () => void;
	updateUser: (user: IUser) => void;
	updateOrgPreferences: (orgPreferences: OrgPreference[]) => void;
	updateOrg(orgId: string, updatedOrgName: string): void;
	versionData: PayloadProps | null;
}

// User
export interface IUser extends User {
	accessJwt: string;
	refreshJwt: string;
}
