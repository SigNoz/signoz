/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { IAppContext } from 'providers/App/types';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import { LicenseState } from 'types/api/licensesV3/getActive';
import { USER_ROLES } from 'types/roles';

const { activeLicense, trialInfo } = createAppContextMock(USER_ROLES.ADMIN);

const DAY_IN_SECONDS = 24 * 60 * 60;

/**
 * Each of the three blocked-workspace pages bounces to home unless the license
 * says what put it there, so the state the page exists for is what the context
 * has to carry.
 */
export const licenseInState = (state: LicenseState): Partial<IAppContext> => ({
	activeLicense: activeLicense && { ...activeLicense, state },
	activeLicenseFetchError: null,
	isFetchingActiveLicense: false,
});

/** A trial that ran out, which is what locks the workspace. */
export const blockedTrial = (nowInSeconds: number): Partial<IAppContext> => ({
	trialInfo: {
		...trialInfo,
		onTrial: true,
		workSpaceBlock: true,
		trialStart: nowInSeconds - 30 * DAY_IN_SECONDS,
		trialEnd: nowInSeconds - DAY_IN_SECONDS,
		trialConvertedToSubscription: false,
		gracePeriodEnd: nowInSeconds + 14 * DAY_IN_SECONDS,
	},
	isFetchingActiveLicense: false,
});
