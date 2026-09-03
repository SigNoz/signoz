import type { Meta, StoryObj } from '@storybook/react-vite';
import { rest } from 'msw';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsEditMocks } from './ChannelsEdit.stories.mocks';

import AlertList from '../../index';

type ChannelsEditArgs = PageStoryArgs<typeof channelsEditMocks>;

const pageStory = storyMocks(channelsEditMocks, { layout: 'app' });

/**
 * One channel's settings, with the fields its type asks for and the test call the
 * form makes before saving.
 *
 * Route: `/alerts/channels/edit/:id`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/Edit',
	tags: ['play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsEditArgs>;

export default meta;

/** The page loads the saved channel before it renders the form. */
const untilLoaded = { timeout: 15_000 };

type Story = StoryObj<ChannelsEditArgs>;

/**
 * A saved notification channel opened for editing: the name and the type are
 * fixed, and the integration's own settings are filled from what was stored.
 */
export const Default: Story = {};

/** Mutation: clearing the required webhook URL surfaces the form's validation feedback. */
export const InvalidRequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const webhookUrl = await canvas.findByTestId(
			'webhook-url-textbox',
			undefined,
			untilLoaded,
		);

		await userEvent.clear(webhookUrl);
		await userEvent.click(
			await canvas.findByTestId('save-channel-button', undefined, untilLoaded),
		);
		await screen.findByText('Webhook URL is mandatory');
	},
};

/** Mutation: a failed test request keeps the edit form open and renders its error feedback. */
export const TestChannelFailure: Story = {
	parameters: {
		msw: [
			rest.post('http://localhost/api/v1/testChannel', (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						status: 'error',
						error: {
							code: 'STORYBOOK_FAILURE',
							message: 'Storybook forced channel failure',
							url: '',
							errors: [],
						},
					}),
				),
			),
		],
	},
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'test-channel-button',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText('Storybook forced channel failure');
	},
};

/** Mutation: a failed save leaves the saved channel editable and surfaces the request error. */
export const SaveFailure: Story = {
	parameters: {
		msw: [
			rest.put('http://localhost/api/v1/channels/:id', (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						status: 'error',
						error: {
							code: 'STORYBOOK_FAILURE',
							message: 'Storybook forced channel failure',
							url: '',
							errors: [],
						},
					}),
				),
			),
		],
	},
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'save-channel-button',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText('Storybook forced channel failure');
	},
};

/**
 * The PagerDuty channel, whose form carries the routing key and the extra
 * details sent with the incident.
 */
export const PagerDuty: Story = {
	args: { channelType: 'pagerduty' },
};

/** The webhook channel, saved with basic auth on the outgoing request. */
export const Webhook: Story = {
	args: { channelType: 'webhook' },
};

/**
 * The Opsgenie channel, whose form carries the integration API key and the
 * priority the alert is raised at.
 */
export const Opsgenie: Story = {
	args: { channelType: 'opsgenie' },
};

/**
 * The email channel, whose only editable field is the comma-separated recipient
 * list: the form keeps the HTML body and the headers it was saved with.
 */
export const Email: Story = {
	args: { channelType: 'email' },
};

/**
 * The Microsoft Teams channel, stored under `msteamsv2_configs` and filled from
 * the channel's incoming webhook.
 */
export const MicrosoftTeams: Story = {
	args: { channelType: 'msteams' },
};

/** The Google Chat channel, filled from the space's incoming webhook. */
export const GoogleChat: Story = {
	args: { channelType: 'googlechat' },
};

/**
 * The Jira channel, which files an issue: the site and project it files into,
 * the transitions that resolve and reopen it, and the API token behind the
 * Atlassian account, which the form reads off the basic auth block.
 */
export const Jira: Story = {
	args: { channelType: 'jira' },
};

/**
 * The Jira Service Management Ops channel, whose tags are stored as one
 * comma-separated string and come back as chips.
 */
export const JiraServiceManagementOps: Story = {
	args: { channelType: 'jsmops' },
};

/**
 * The incident.io channel, pointed at one alert source's events URL with the
 * token for it and the metadata merged over the alert's labels.
 */
export const IncidentIO: Story = {
	args: { channelType: 'incidentio' },
};
