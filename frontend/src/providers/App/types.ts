import type { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';
import type APIError from 'types/api/error';
import type { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import type {
	LicenseResModel,
	TrialInfo,
} from 'types/api/licensesV3/getActive';
import type {
	OrgPreference,
	UserPreference,
} from 'types/api/preferences/preference';
import type { Organization } from 'types/api/user/getOrganization';
import type { UserResponse as User } from 'types/api/user/getUser';
import type { Info } from 'types/api/v1/version/get';
import type { GetHosts200 } from 'api/generated/services/sigNoz.schemas/getHosts200';

export interface IAppContext {
	user: IUser;
	activeLicense: LicenseResModel | null;
	trialInfo: TrialInfo | null;
	featureFlags: FeatureFlags[] | null;
	orgPreferences: OrgPreference[] | null;
	userPreferences: UserPreference[] | null;
	hostsData: GetHosts200 | null;
	isLoggedIn: boolean;
	isPreflightLoading: boolean;
	org: Organization[] | null;
	isFetchingUser: boolean;
	isFetchingActiveLicense: boolean;
	isFetchingHosts: boolean;
	isFetchingFeatureFlags: boolean;
	isFetchingOrgPreferences: boolean;
	isFetchingUserPreferences: boolean;
	userFetchError: unknown;
	activeLicenseFetchError: APIError | null;
	hostsFetchError: unknown;
	featureFlagsFetchError: unknown;
	orgPreferencesFetchError: unknown;
	changelog: ChangelogSchema | null;
	showChangelogModal: boolean;
	activeLicenseRefetch: () => void;
	updateUser: (user: IUser) => void;
	updateOrgPreferences: (orgPreferences: OrgPreference[]) => void;
	updateUserPreferenceInContext: (userPreference: UserPreference) => void;
	updateOrg(orgId: string, updatedOrgName: string): void;
	updateChangelog(payload: ChangelogSchema): void;
	toggleChangelogModal(): void;
	versionData: Info | null;
	hasEditPermission: boolean;
}

// User
export interface IUser extends User {
	accessJwt: string;
	refreshJwt: string;
}
