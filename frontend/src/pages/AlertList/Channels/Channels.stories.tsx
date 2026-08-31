import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsMocks } from './Channels.stories.mocks';

import AlertList from '../index';

type ChannelsArgs = PageStoryArgs<typeof channelsMocks>;

const pageStory = storyMocks(channelsMocks);

/**
 * Notification channels tab: what a rule can notify, one row per channel.
 *
 * Route: `/alerts?tab=Channels`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/List',
	tags: ['role-gated'],
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsArgs>;

export default meta;

type Story = StoryObj<ChannelsArgs>;

/**
 * Where notifications go: every configured channel with the integration it
 * sends through.
 */
export const Default: Story = {};

/** A workspace with nowhere to send an alert yet. */
export const NoChannels: Story = {
	args: { channels: 0 },
};

/**
 * A viewer: the Action column and the New Alert Channel button are gone, and
 * the button explains who to ask.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};
