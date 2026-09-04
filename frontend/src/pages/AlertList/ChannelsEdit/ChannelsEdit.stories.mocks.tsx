/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	CHANNEL_TYPES,
	channelResponse,
	type ChannelType,
} from '../__story_mockdata__/alerts';

const STORY_CHANNEL_ID = '1';

const CHANNEL = 'Channel · integration';

export const channelsEditMocks = defineStoryMocks({
	controls: {
		channelType: choiceControl<ChannelType>('Channel type', {
			group: CHANNEL,
			description:
				'The integration the saved channel uses, which decides every field below the type picker.',
			options: CHANNEL_TYPES,
			value: 'slack',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/channels/:id',
			response.json((req) =>
				channelResponse(String(req.params.id), values.channelType),
			),
		),

		rest.put('http://localhost/api/v1/channels/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.post('http://localhost/api/v1/testChannel', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),
	],
	config: () => ({ route: `/alerts/channels/edit/${STORY_CHANNEL_ID}` }),
});
