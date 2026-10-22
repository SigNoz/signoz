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
const ROUTE = 'Channel · route';

/** The `?kind=` values worth reaching: a known type, and one the form rejects. */
const URL_KINDS = ['none', 'jira', 'not-a-kind'] as const;
type UrlKind = (typeof URL_KINDS)[number];

const resolveChannelCreated: MockResolver = (_req, res, ctx) =>
	res(ctx.status(201), ctx.json({ status: 'success', data: null }));

const resolveChannelTested: MockResolver = (_req, res, ctx) =>
	res(ctx.status(200), ctx.json({ status: 'success', data: null }));

const rejectChannelAction: MockResolver = (_req, res, ctx) =>
	res(ctx.status(500), ctx.json(channelActionError()));

/**
 * The form holds the channel type in component state, so the type itself is
 * stories with a `play` that picks one rather than a control; saving and
 * testing the channel are. The type can also arrive in the URL, which the list
 * uses to carry its filter over, so that is a control on the route.
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
		kindInUrl: choiceControl<UrlKind>('Channel type in the URL', {
			group: ROUTE,
			options: URL_KINDS,
			value: 'none',
		}),
	},
	handlers: (values) => [
		rest.post(
			'http://localhost/api/v2/notification_channels',
			values.saveOutcome === 'fails' ? rejectChannelAction : resolveChannelCreated,
		),

		rest.post(
			'http://localhost/api/v2/notification_channels/test',
			values.testOutcome === 'fails' ? rejectChannelAction : resolveChannelTested,
		),
	],
	config: (values) => ({
		route:
			values.kindInUrl === 'none'
				? '/alerts/channels/new'
				: `/alerts/channels/new?kind=${values.kindInUrl}`,
	}),
});
