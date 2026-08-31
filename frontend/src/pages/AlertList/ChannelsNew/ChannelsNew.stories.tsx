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

/** The email form: the recipients and the HTML body the alert is sent as. */
export const Email: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectChannelType(canvasElement, /^Email$/);
	},
};
