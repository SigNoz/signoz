import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsNewMocks } from './ChannelsNew.stories.mocks';

import AlertList from '../../index';

type ChannelsNewArgs = PageStoryArgs<typeof channelsNewMocks>;

const pageStory = storyMocks(channelsNewMocks, { layout: 'app' });

/**
 * The new channel form: pick a type, fill its fields, test it, save.
 *
 * Route: `/alerts/channels/new`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/New',
	tags: ['play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsNewArgs>;

export default meta;

type Story = StoryObj<ChannelsNewArgs>;

/**
 * The type is an antd Select: clicking the element carrying the test id does
 * nothing, the combobox inside it is what opens the list.
 */
const selectChannelType = async (
	canvasElement: HTMLElement,
	label: RegExp,
): Promise<void> => {
	const canvas = within(canvasElement);
	const select = await canvas.findByTestId('channel-type-select');

	await userEvent.click(within(select).getByRole('combobox'));
	await userEvent.click(await screen.findByTitle(label));
	// The form under the Select swaps a render after the option is taken, so the
	// Select's own value is what says the story is on the type it names.
	await within(select).findByTitle(label);
};

/** A new notification channel, on the Slack form the page opens with. */
export const Default: Story = {};

/** Interaction: the channel-type Select opens its real portal-backed option list. */
export const ChannelTypeSelectOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const select = await within(canvasElement).findByTestId(
			'channel-type-select',
		);

		await userEvent.click(within(select).getByRole('combobox'));
		await screen.findByRole('listbox');
	},
};

/** Mutation: saving without a channel name shows the form's required-field feedback. */
export const InvalidRequiredFields: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId('save-channel-button'),
		);
		await screen.findByText('Channel name is mandatory');
	},
};

/** Mutation: a failed test request opens the application's error feedback. */
export const TestChannelFailure: Story = {
	args: { testOutcome: 'fails' },
	// The mocked test request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId('test-channel-button'),
		);
		await screen.findByText('Storybook forced channel failure');
	},
};

/** Mutation: a failed create request leaves the form visible with error feedback. */
export const SaveFailure: Story = {
	args: { saveOutcome: 'fails' },
	// The mocked save request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByTestId('channel-name-textbox'),
			'Storybook channel',
		);
		await userEvent.type(
			await canvas.findByTestId('webhook-url-textbox'),
			'https://hooks.slack.com/services/storybook',
		);
		await userEvent.click(await canvas.findByTestId('save-channel-button'));
		await screen.findByText('Storybook forced channel failure');
	},
};

/** The webhook form: the URL to post to and the auth to send with it. */
export const Webhook: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Webhook$/);
	},
};

/** The PagerDuty form: routing key, severity and the incident details. */
export const PagerDuty: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Pagerduty$/);
	},
};

/** The Opsgenie form: the integration API key, the alert body and its priority. */
export const Opsgenie: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Opsgenie$/);
	},
};

/** The email form: the recipients and the HTML body the alert is sent as. */
export const Email: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Email$/);
	},
};

/** The Microsoft Teams form: the channel's incoming webhook and the card text. */
export const MicrosoftTeams: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Microsoft Teams$/);
	},
};

/**
 * The Google Chat form, whose webhook URL is rejected unless it is an https URL
 * on `chat.googleapis.com`.
 */
export const GoogleChat: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Google Chat$/);
	},
};

/**
 * The Jira form: where the issue is filed, the transitions that close and
 * reopen it, and the Atlassian account the API token belongs to.
 */
export const Jira: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Jira$/);
	},
};

/** The Jira Service Management Ops form: the API key, priority and tags. */
export const JiraServiceManagementOps: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Jira Service Management Ops$/);
	},
};

/** The incident.io form: the alert source's events URL and its token. */
export const IncidentIO: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^incident\.io$/);
	},
};
