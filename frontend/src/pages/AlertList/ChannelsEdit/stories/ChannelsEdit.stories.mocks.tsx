/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockResolver } from '@/storybook/msw/types';

import {
	CHANNEL_ACTION_OUTCOMES,
	channelActionError,
	CHANNEL_TYPES,
	channelResponse,
	type ChannelActionOutcome,
	type ChannelType,
} from '../../stories/__story_mockdata__/alerts';

const STORY_CHANNEL_ID = '1';

const CHANNEL = 'Channel · integration';
const ACTIONS = 'Channel · actions';

const resolveChannelActionSuccess: MockResolver = (_req, res, ctx) =>
	res(ctx.status(200), ctx.json({ status: 'success', data: null }));

const rejectChannelAction: MockResolver = (_req, res, ctx) =>
	res(ctx.status(500), ctx.json(channelActionError()));

export const channelsEditMocks = defineStoryMocks({
	controls: {
		channelType: choiceControl<ChannelType>('Channel type', {
			group: CHANNEL,
			description:
				'The integration the saved channel uses, which decides every field below the type picker.',
			options: CHANNEL_TYPES,
			value: 'slack',
		}),
		saveOutcome: choiceControl<ChannelActionOutcome>('Saving the channel', {
			group: ACTIONS,
			options: CHANNEL_ACTION_OUTCOMES,
			value: 'succeeds',
		}),
		testOutcome: choiceControl<ChannelActionOutcome>('Testing the channel', {
			group: ACTIONS,
			options: CHANNEL_ACTION_OUTCOMES,
			value: 'succeeds',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/channels/:id',
			response.json((req) =>
				channelResponse(String(req.params.id), values.channelType),
			),
		),

		rest.put(
			'http://localhost/api/v1/channels/:id',
			values.saveOutcome === 'fails'
				? rejectChannelAction
				: resolveChannelActionSuccess,
		),

		rest.post(
			'http://localhost/api/v1/testChannel',
			values.testOutcome === 'fails'
				? rejectChannelAction
				: resolveChannelActionSuccess,
		),
	],
	config: () => ({ route: `/alerts/channels/edit/${STORY_CHANNEL_ID}` }),
});
