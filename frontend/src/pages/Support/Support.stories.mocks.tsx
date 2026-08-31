/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { IAppContext } from 'providers/App/types';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import { USER_ROLES } from 'types/roles';

import { toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const CHANNELS = 'Support · channels';

const { featureFlags: baseFeatureFlags, trialInfo } = createAppContextMock(
	USER_ROLES.ADMIN,
);

/**
 * Chat is the one channel the plan gates: without premium support the card
 * opens the add-a-card modal instead of the widget.
 */
const supportContext = (premium: boolean): Partial<IAppContext> => ({
	featureFlags: (baseFeatureFlags ?? []).map((flag) =>
		flag.name === FeatureKeys.PREMIUM_SUPPORT
			? { ...flag, active: premium }
			: flag,
	),
	trialInfo: trialInfo && {
		...trialInfo,
		trialConvertedToSubscription: premium,
	},
});

export const supportMocks = defineStoryMocks({
	controls: {
		premiumSupport: toggleControl('Premium support', {
			group: CHANNELS,
			description:
				'Whether the plan carries chat support. Without it the chat card asks for a card first.',
			value: true,
		}),
	},
	handlers: () => [
		rest.post('http://localhost/api/v1/checkout', (_req, res, ctx) =>
			res(
				ctx.json({
					status: 'success',
					data: { redirectURL: 'https://billing.signoz.io/checkout' },
				}),
			),
		),
	],
	config: (values) => ({
		route: ROUTES.SUPPORT,
		appContext: supportContext(values.premiumSupport),
	}),
});
