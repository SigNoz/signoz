/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	ROUTING_POLICY_MAX,
	routingPoliciesResponse,
} from './__story_mockdata__/routingPolicies';

import {
	CHANNEL_MAX,
	channelNames,
	channelsResponse,
} from '../__story_mockdata__/alerts';
import { AlertListSubTabs, AlertListTabs } from '../types';

const LIST = 'Routing policies · list';

export const routingPoliciesMocks = defineStoryMocks({
	controls: {
		policies: countControl('Routing policies', {
			group: LIST,
			description: 'The table paginates at five, so the cap is past that.',
			value: 4,
			max: ROUTING_POLICY_MAX,
		}),
		channels: countControl('Notification channels', {
			group: LIST,
			description:
				'The channels a policy can route to, and the ones its Channels row names.',
			value: 6,
			max: CHANNEL_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/route_policies',
			response.json(() =>
				routingPoliciesResponse(values.policies, channelNames(values.channels)),
			),
		),

		rest.post('http://localhost/api/v1/route_policies', (_req, res, ctx) =>
			res(ctx.status(201), ctx.json({ status: 'success', data: null })),
		),

		rest.put('http://localhost/api/v1/route_policies/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.delete('http://localhost/api/v1/route_policies/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v1/channels',
			response.json(() => channelsResponse(values.channels)),
		),
	],
	config: () => ({
		route: `/alerts?tab=${AlertListTabs.CONFIGURATION}&subTab=${AlertListSubTabs.ROUTING_POLICIES}`,
	}),
});
