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
	type ChannelActionOutcome,
} from '../../stories/__story_mockdata__/alerts';

const ACTIONS = 'Channel · actions';

const resolveChannelCreated: MockResolver = (_req, res, ctx) =>
	res(ctx.status(201), ctx.json({ status: 'success', data: null }));

const resolveChannelTested: MockResolver = (_req, res, ctx) =>
	res(ctx.status(200), ctx.json({ status: 'success', data: null }));

const rejectChannelAction: MockResolver = (_req, res, ctx) =>
	res(ctx.status(500), ctx.json(channelActionError()));

/**
 * The form holds the channel type in component state, so the type itself is
 * stories with a `play` that picks one rather than a control; saving and
 * testing the channel are.
 */
export const channelsNewMocks = defineStoryMocks({
	controls: {
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
	handlers: (values) => [
		rest.post(
			'http://localhost/api/v1/channels',
			values.saveOutcome === 'fails' ? rejectChannelAction : resolveChannelCreated,
		),

		rest.post(
			'http://localhost/api/v1/testChannel',
			values.testOutcome === 'fails' ? rejectChannelAction : resolveChannelTested,
		),
	],
	config: () => ({ route: '/alerts/channels/new' }),
});
