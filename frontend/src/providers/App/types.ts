import { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';
import APIError from 'types/api/error';
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { LicenseResModel, TrialInfo } from 'types/api/licensesV3/getActive';
import {
	OrgPreference,
	UserPreference,
} from 'types/api/preferences/preference';
import { Organization } from 'types/api/user/getOrganization';
import { UserResponse as User } from 'types/api/user/getUser';
import { PayloadProps } from 'types/api/user/getVersion';

export interface IAppContext {
	user: IUser;
	activeLicense: LicenseResModel | null;
	trialInfo: TrialInfo | null;
	featureFlags: FeatureFlags[] | null;
	orgPreferences: OrgPreference[] | null;
	userPreferences: UserPreference[] | null;
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
	changelog: ChangelogSchema | null;
	activeLicenseRefetch: () => void;
	updateUser: (user: IUser) => void;
	updateOrgPreferences: (orgPreferences: OrgPreference[]) => void;
	updateUserPreferenceInContext: (userPreference: UserPreference) => void;
	updateOrg(orgId: string, updatedOrgName: string): void;
	updateChangelog(payload: ChangelogSchema): void;
	versionData: PayloadProps | null;
}

// User
export interface IUser extends User {
	accessJwt: string;
	refreshJwt: string;
}
