/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { LicenseState } from 'types/api/licensesV3/getActive';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { licenseInState } from '../../WorkspaceLocked/stories/__story_mockdata__/workspaceStates';

export const workspaceSuspendedMocks = defineStoryMocks({
	controls: {},
	handlers: () => [
		rest.put('http://localhost/api/v1/subscriptions', (_req, res, ctx) =>
			res(
				ctx.json({
					status: 'success',
					data: { redirectURL: 'https://billing.signoz.io/portal' },
				}),
			),
		),
	],
	config: () => ({
		route: ROUTES.WORKSPACE_SUSPENDED,
		appContext: licenseInState(LicenseState.DEFAULTED),
	}),
});
