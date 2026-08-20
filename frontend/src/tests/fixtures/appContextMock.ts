import { FeatureKeys } from 'constants/features';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import { IAppContext } from 'providers/App/types';
import {
	LicenseEvent,
	LicensePlatform,
	LicenseState,
	LicenseStatus,
} from 'types/api/licensesV3/getActive';
import { ROLES, USER_ROLES } from 'types/roles';

/**
 * Factory for the spies assigned to the callable members of `IAppContext`.
 * Jest passes `jest.fn`, Storybook passes `fn` from `storybook/test`; the
 * fixture itself stays free of any test-runner import so both can consume it.
 */
export type SpyFactory = () => (...args: unknown[]) => void;

const noopSpyFactory: SpyFactory = () => (): void => {};

export const defaultFeatureFlags = [
	{ name: FeatureKeys.SSO, active: true, usage: 0, usage_limit: -1, route: '' },
	{
		name: FeatureKeys.USE_SPAN_METRICS,
		active: false,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
	{
		name: FeatureKeys.GATEWAY,
		active: true,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
	{
		name: FeatureKeys.PREMIUM_SUPPORT,
		active: true,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
	{
		name: FeatureKeys.ANOMALY_DETECTION,
		active: true,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
	{
		name: FeatureKeys.ONBOARDING,
		active: true,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
	{
		name: FeatureKeys.CHAT_SUPPORT,
		active: true,
		usage: 0,
		usage_limit: -1,
		route: '',
	},
];

export function createAppContextMock(
	role: string,
	appContextOverrides?: Partial<IAppContext>,
	createSpy: SpyFactory = noopSpyFactory,
): IAppContext {
	return {
		activeLicense: {
			key: 'test-key',
			event_queue: {
				created_at: '0',
				event: LicenseEvent.NO_EVENT,
				scheduled_at: '0',
				status: '',
				updated_at: '0',
			},
			state: LicenseState.ACTIVATED,
			status: LicenseStatus.VALID,
			platform: LicensePlatform.CLOUD,
			created_at: '0',
			plan: {
				created_at: '0',
				description: '',
				is_active: true,
				name: '',
				updated_at: '0',
			},
			plan_id: '0',
			free_until: '0',
			updated_at: '0',
			valid_from: 0,
			valid_until: 0,
		},
		trialInfo: {
			trialStart: -1,
			trialEnd: -1,
			onTrial: false,
			workSpaceBlock: false,
			trialConvertedToSubscription: false,
			gracePeriodEnd: -1,
		},
		isFetchingActiveLicense: false,
		activeLicenseFetchError: null,
		changelog: null,
		user: {
			accessJwt: 'some-token',
			refreshJwt: 'some-refresh-token',
			id: 'some-user-id',
			email: 'does-not-matter@signoz.io',
			displayName: 'John Doe',
			createdAt: 1732544623,
			organization: 'Nightswatch',
			orgId: 'does-not-matter-id',
			role: role as ROLES,
		},
		org: [
			{
				createdAt: 0,
				id: 'does-not-matter-id',
				displayName: 'Pentagon',
			},
		],
		hasEditPermission: role === USER_ROLES.ADMIN || role === USER_ROLES.EDITOR,
		isFetchingUser: false,
		userFetchError: null,
		featureFlags: defaultFeatureFlags,
		isFetchingFeatureFlags: false,
		featureFlagsFetchError: null,
		hostsData: null,
		isFetchingHosts: false,
		hostsFetchError: null,
		orgPreferences: [
			{
				name: ORG_PREFERENCES.ORG_ONBOARDING,
				description: 'Organisation Onboarding',
				valueType: 'boolean',
				defaultValue: false,
				allowedValues: ['true', 'false'],
				allowedScopes: ['org'],
				value: false,
			},
		],
		userPreferences: [],
		updateUserPreferenceInContext: createSpy(),
		isFetchingOrgPreferences: false,
		isFetchingUserPreferences: false,
		orgPreferencesFetchError: null,
		isLoggedIn: true,
		isPreflightLoading: false,
		showChangelogModal: false,
		updateUser: createSpy(),
		updateOrg: createSpy(),
		updateOrgPreferences: createSpy(),
		activeLicenseRefetch: createSpy(),
		updateChangelog: createSpy(),
		toggleChangelogModal: createSpy(),
		versionData: {
			version: '1.0.0',
			ee: 'Y',
			setupCompleted: true,
		},

		...appContextOverrides,
	};
}
