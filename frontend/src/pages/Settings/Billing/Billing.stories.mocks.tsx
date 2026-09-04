/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	BILLED_DAYS_MAX,
	checkoutResponse,
	PLAN_STATES,
	type PlanState,
	SUBSCRIPTION_STATUSES,
	type SubscriptionStatus,
	trialInfoFor,
	usageResponse,
} from './__story_mockdata__/billing';

const USAGE = 'Billing · usage';
const PLAN = 'Billing · plan';

export const billingMocks = defineStoryMocks({
	controls: {
		plan: choiceControl<PlanState>('Plan', {
			group: PLAN,
			description:
				'Where the workspace is in its subscription. This tab owns `trialInfo`, so the App shell Banner control does not reach it here.',
			options: PLAN_STATES,
			value: 'subscribed',
		}),
		billedDays: countControl('Days billed so far', {
			group: USAGE,
			description:
				'How far into the period the workspace is. One bar per day, and the bill is what those days add up to.',
			value: 12,
			max: BILLED_DAYS_MAX,
		}),
		subscription: choiceControl<SubscriptionStatus>('Subscription', {
			group: USAGE,
			description:
				'A past-due subscription puts the payment-failure callout above the graph.',
			options: SUBSCRIPTION_STATUSES,
			value: 'active',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/billing',
			response.json(() => ({
				status: 'success',
				data: usageResponse(values.billedDays, values.subscription),
			})),
		),

		rest.post(
			'http://localhost/api/v1/checkout',
			response.json(() => checkoutResponse()),
		),

		rest.post(
			'http://localhost/api/v1/portal',
			response.json(() => checkoutResponse()),
		),
	],
	config: ({ plan }) => ({
		route: ROUTES.BILLING,
		appContext: { trialInfo: trialInfoFor(plan) },
	}),
});
