/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { blockedTrial } from './__story_mockdata__/workspaceStates';

/**
 * The trial's own dates are what the page counts down from, so they are pinned
 * rather than read off the clock and the copy stays the same on every run.
 */
const BLOCKED_AT = 1_766_000_000;

export const workspaceLockedMocks = defineStoryMocks({
	controls: {},
	handlers: () => [
		rest.post('http://localhost/api/v1/checkout', (_req, res, ctx) =>
			res(
				ctx.json({
					status: 'success',
					data: { redirectURL: 'https://billing.signoz.io/checkout' },
				}),
			),
		),
		rest.put('http://localhost/api/v3/licenses', (_req, res, ctx) =>
			res(ctx.json({ status: 'success', data: null })),
		),
	],
	config: () => ({
		route: ROUTES.WORKSPACE_LOCKED,
		appContext: blockedTrial(BLOCKED_AT),
	}),
});
