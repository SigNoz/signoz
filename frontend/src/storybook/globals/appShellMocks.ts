import { StatusCodes } from 'http-status-codes';
import { FeatureKeys } from 'constants/features';
import { USER_PREFERENCES } from 'constants/userPreferences';
import type { IAppContext } from 'providers/App/types';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import APIError from 'types/api/error';
import type { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';
import {
	LicenseEvent,
	LicensePlatform,
	type LicenseResModel,
	LicenseState,
} from 'types/api/licensesV3/getActive';
import type { UserPreference } from 'types/api/preferences/preference';
import { USER_ROLES } from 'types/roles';
import { setNoAuthMode } from 'utils/noAuthMode';

import { choiceControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import { RESPONSE_STATES, type ResponseState } from '../runtime/responseState';

const APP_SHELL = 'App shell';
const DATA = 'Data';
const LICENSE = 'License';

const DAY_IN_SECONDS = 24 * 60 * 60;

const LICENSES = [
	'cloud',
	'enterprise',
	'community-enterprise',
	'community',
] as const;

const BANNERS = [
	'none',
	'trial-expiry',
	'payment-failed',
	'license-expired',
	'license-terminated',
	'no-auth',
] as const;

type License = (typeof LICENSES)[number];

type Banner = (typeof BANNERS)[number];

const SIDENAV_STATES = ['pinned', 'collapsed'] as const;

type SidenavState = (typeof SIDENAV_STATES)[number];

const {
	activeLicense: baseLicense,
	trialInfo: baseTrialInfo,
	featureFlags: baseFeatureFlags,
	versionData: baseVersionData,
} = createAppContextMock(USER_ROLES.ADMIN);

/**
 * The status code `/licenses/active` failed with is itself the signal
 * `useGetTenantLicense` reads: 404 is the enterprise build running unlicensed,
 * 501 the community build, where the endpoint does not exist at all.
 */
const licenseFetchError = (httpStatusCode: StatusCodes): APIError =>
	new APIError({
		httpStatusCode,
		error: {
			code: 'license_unavailable',
			message: 'storybook: no active license',
			url: '',
			errors: [],
		},
	});

const feature = (name: FeatureKeys, active: boolean): FeatureFlagProps => ({
	name,
	active,
	usage: 0,
	usage_limit: -1,
	route: '',
});

/**
 * What the backend serves an unlicensed enterprise build — the same keys as the
 * enterprise plan, all inactive. Mirrors `BasicPlan` in
 * `pkg/types/licensetypes/plan.go`; the community build serves none at all.
 */
const BASIC_PLAN: FeatureFlagProps[] = [
	FeatureKeys.SSO,
	FeatureKeys.GATEWAY,
	FeatureKeys.PREMIUM_SUPPORT,
	FeatureKeys.ANOMALY_DETECTION,
].map((name) => feature(name, false));

/**
 * Which of the four deployments `useGetTenantLicense` distinguishes the story
 * runs on. The license drives the plan the app believes it is on, so the feature
 * flags and the enterprise/community build marker follow it.
 */
const licenseContext = (license: License): Partial<IAppContext> => {
	switch (license) {
		case 'enterprise':
			return {
				activeLicense: baseLicense && {
					...baseLicense,
					platform: LicensePlatform.SELF_HOSTED,
				},
				activeLicenseFetchError: null,
			};

		case 'community-enterprise':
			return {
				activeLicense: null,
				activeLicenseFetchError: licenseFetchError(StatusCodes.NOT_FOUND),
				featureFlags: BASIC_PLAN,
			};

		case 'community':
			return {
				activeLicense: null,
				activeLicenseFetchError: licenseFetchError(StatusCodes.NOT_IMPLEMENTED),
				featureFlags: [],
				versionData: baseVersionData && { ...baseVersionData, ee: 'N' },
			};

		default:
			return {
				activeLicense: baseLicense,
				activeLicenseFetchError: null,
				featureFlags: baseFeatureFlags,
			};
	}
};

/**
 * A banner that reads the license needs one to read, so the community
 * deployments fall back to the licensed fixture rather than showing nothing.
 */
const licensedBanner = (
	activeLicense: LicenseResModel | null,
	extend: (license: LicenseResModel) => LicenseResModel,
): Partial<IAppContext> => {
	const license = activeLicense ?? baseLicense;

	return {
		activeLicense: license && extend(license),
		activeLicenseFetchError: null,
	};
};

const bannerContext = (
	banner: Banner,
	activeLicense: LicenseResModel | null,
): Partial<IAppContext> => {
	const nowInSeconds = Math.floor(Date.now() / 1000);

	switch (banner) {
		case 'trial-expiry':
			return {
				trialInfo: {
					...baseTrialInfo,
					onTrial: true,
					trialStart: nowInSeconds - 27 * DAY_IN_SECONDS,
					trialEnd: nowInSeconds + 3 * DAY_IN_SECONDS,
					workSpaceBlock: false,
					trialConvertedToSubscription: false,
					gracePeriodEnd: -1,
				},
			};

		case 'payment-failed':
			return licensedBanner(activeLicense, (license) => ({
				...license,
				eventQueue: {
					...license.eventQueue,
					event: LicenseEvent.DEFAULT,
					scheduledAt: new Date(
						Date.now() + 7 * DAY_IN_SECONDS * 1000,
					).toISOString(),
				},
			}));

		// Both restricted-workspace banners need a self-hosted license; the cloud
		// platform never reaches that branch.
		case 'license-expired':
			return licensedBanner(activeLicense, (license) => ({
				...license,
				platform: LicensePlatform.SELF_HOSTED,
				state: LicenseState.EXPIRED,
			}));

		case 'license-terminated':
			return licensedBanner(activeLicense, (license) => ({
				...license,
				platform: LicensePlatform.SELF_HOSTED,
				state: LicenseState.TERMINATED,
			}));

		default:
			return {};
	}
};

/**
 * `AppLayout` lays the shell out from the context rather than the API, so the
 * side nav only matches the real app when this is seeded.
 */
const sidenavPreferences = (pinned: boolean): UserPreference[] => [
	{
		name: USER_PREFERENCES.SIDENAV_PINNED,
		description: 'Keep the side navigation pinned open',
		valueType: 'boolean',
		defaultValue: false,
		allowedValues: ['true', 'false'],
		allowedScopes: ['user'],
		value: pinned,
	},
];

/** Who is looking at the page is `authzMocks`; everything else is here. */
export const appShellMocks = defineStoryMocks({
	controls: {
		license: choiceControl<License>('License', {
			group: LICENSE,
			description:
				'The deployment the story runs on, as `useGetTenantLicense` reads it. `cloud` and `enterprise` are licensed and carry the enterprise plan; `community-enterprise` is the enterprise build with no license (basic plan, every feature inactive) and `community` the open-source build (no plan, `ee: N`).',
			options: LICENSES,
			value: 'cloud',
		}),
		banner: choiceControl<Banner>('Banner', {
			group: APP_SHELL,
			description:
				'License, trial and no-auth banners above the shell. The license ones need a license to read, so they override an unlicensed License control.',
			options: BANNERS,
			value: 'none',
		}),
		sidenav: choiceControl<SidenavState>('Side nav', {
			group: APP_SHELL,
			options: SIDENAV_STATES,
			value: 'pinned',
		}),
		dataState: choiceControl<ResponseState>('State', {
			group: DATA,
			description: 'How the endpoints the page owns answer.',
			options: RESPONSE_STATES,
			value: 'loaded',
		}),
	},
	responseState: ({ dataState }) => dataState,
	config: ({ license, banner, sidenav }) => {
		const tenant = licenseContext(license);

		return {
			appContext: {
				...tenant,
				...bannerContext(banner, tenant.activeLicense ?? null),
				userPreferences: sidenavPreferences(sidenav === 'pinned'),
			},
		};
	},
	effect: ({ banner }) => {
		setNoAuthMode(banner === 'no-auth');
	},
});

export type AppShellArgs = StoryMockArgs<typeof appShellMocks>;
