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
	JIRA_DEPLOYMENTS,
	type JiraDeploymentChoice,
	notificationChannelResponse,
	type ChannelActionOutcome,
	type ChannelType,
	WEBHOOK_AUTHS,
	type WebhookAuthChoice,
} from '../../stories/__story_mockdata__/alerts';
import {
	recordChannelTestRequest,
	resetChannelTestRequests,
} from './__story_mockdata__/channelsEdit';

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
		webhookAuth: choiceControl<WebhookAuthChoice>('Webhook credentials', {
			group: CHANNEL,
			description:
				'What the saved webhook authenticates with, which picks the auth option the form opens on. Only read when the channel type is webhook.',
			options: WEBHOOK_AUTHS,
			value: 'basic',
		}),
		jiraDeployment: choiceControl<JiraDeploymentChoice>('Jira deployment', {
			group: CHANNEL,
			description:
				'Whether the saved Jira channel points at Jira Cloud (email + API token) or a self-hosted Jira (personal access token). Only read when the channel type is jira.',
			options: JIRA_DEPLOYMENTS,
			value: 'cloud',
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
			'http://localhost/api/v2/notification_channels/:id',
			response.json((req) =>
				notificationChannelResponse(
					String(req.params.id),
					values.channelType,
					values.webhookAuth,
					values.jiraDeployment,
				),
			),
		),

		rest.put(
			'http://localhost/api/v2/notification_channels/:id',
			values.saveOutcome === 'fails'
				? rejectChannelAction
				: resolveChannelActionSuccess,
		),

		rest.post(
			'http://localhost/api/v2/notification_channels/test',
			async (req) => {
				recordChannelTestRequest(await req.json());
			},
		),

		rest.post(
			'http://localhost/api/v2/notification_channels/test',
			values.testOutcome === 'fails'
				? rejectChannelAction
				: resolveChannelActionSuccess,
		),
	],
	config: () => ({ route: `/alerts/channels/edit/${STORY_CHANNEL_ID}` }),
	effect: () => resetChannelTestRequests(),
});
