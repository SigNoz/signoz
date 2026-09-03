import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsNewMocks } from './ChannelsNew.stories.mocks';

import AlertList from '../index';

type ChannelsNewArgs = PageStoryArgs<typeof channelsNewMocks>;

const pageStory = storyMocks(channelsNewMocks);

/**
 * The new channel form: pick a type, fill its fields, test it, save.
 *
 * Route: `/alerts/channels/new`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/New',
	tags: ['play'],
	component: AlertList,
	decorators: [withAppLayout],
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
};

/** A new notification channel, on the Slack form the page opens with. */
export const Default: Story = {};

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
