import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	CREATE,
	expectDisabled,
	NOTIFICATION_CHANNEL,
	PAGE_LOAD,
} from '../../../stories/channelAuthz';
import { channelsNewMocks } from '../ChannelsNew.stories.mocks';

import AlertList from '../../../index';

type ChannelsNewArgs = PageStoryArgs<typeof channelsNewMocks>;

const pageStory = storyMocks(channelsNewMocks, { layout: 'app' });

/**
 * The new channel form without `create`. Creating a channel and testing one
 * are the same permission, on the collection, so there is no state between
 * the form and the denial.
 *
 * Route: `/alerts/channels/new`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/New Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsNewArgs>;

export default meta;

type Story = StoryObj<ChannelsNewArgs>;

/** The page refuses to render, and the denial names `create`. */
export const NoCreate: Story = {
	args: { revoked: [CREATE] },
	play: async ({ canvasElement }) => {
		await within(canvasElement).findByText(
			'Uh-oh! You are not authorized',
			undefined,
			PAGE_LOAD,
		);
		await expect(
			within(canvasElement).queryByTestId('save-channel-button'),
		).not.toBeInTheDocument();
	},
};

/** No channel permission at all, which denies on the same `create` check. */
export const NoChannelAccess: Story = {
	args: { revoked: NOTIFICATION_CHANNEL },
	play: NoCreate.play,
};

/** The page holds on its loader until the permission check answers. */
export const CheckLoading: Story = {
	args: { authzState: 'loading' },
	play: async ({ canvasElement }) => {
		await new Promise((resolve) => {
			setTimeout(resolve, 1500);
		});
		await expect(
			within(canvasElement).queryByTestId('save-channel-button'),
		).not.toBeInTheDocument();
	},
};

/**
 * The permission check failing rather than denying: the form renders and the
 * API decides on save.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByTestId('channel-name-textbox', undefined, PAGE_LOAD),
			'check-failed',
		);

		await expectDisabled(canvas.getByTestId('save-channel-button'), false);
	},
};
