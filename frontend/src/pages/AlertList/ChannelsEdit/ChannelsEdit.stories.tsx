import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsEditMocks } from './ChannelsEdit.stories.mocks';

import AlertList from '../index';

type ChannelsEditArgs = PageStoryArgs<typeof channelsEditMocks>;

const pageStory = storyMocks(channelsEditMocks);

/**
 * One channel's settings, with the fields its type asks for and the test call the
 * form makes before saving.
 *
 * Route: `/alerts/channels/edit/:id`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/Edit',
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsEditArgs>;

export default meta;

type Story = StoryObj<ChannelsEditArgs>;

/**
 * A saved notification channel opened for editing: the name and the type are
 * fixed, and the integration's own settings are filled from what was stored.
 */
export const Default: Story = {};

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
