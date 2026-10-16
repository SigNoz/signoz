import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	CREATE,
	expectDisabled,
	NOTIFICATION_CHANNEL,
	PAGE_LOAD,
	READ,
	UPDATE,
} from '../../../stories/channelAuthz';
import { channelsEditMocks } from '../ChannelsEdit.stories.mocks';

import AlertList from '../../../index';

type ChannelsEditArgs = PageStoryArgs<typeof channelsEditMocks>;

const pageStory = storyMocks(channelsEditMocks, { layout: 'app' });

/**
 * One channel's settings with one permission missing at a time. Every story
 * here is an admin denied exactly what its name says. The page mounts on `read`
 * alone, `update` decides whether it is editable, and a test send is gated on
 * `create` against the collection, not on the channel.
 *
 * Route: `/alerts/channels/edit/:id`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/Edit Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsEditArgs>;

export default meta;

type Story = StoryObj<ChannelsEditArgs>;

const DENIED_PAGE = 'Uh-oh! You are not authorized';

/** The page refuses to render, and the denial names the channel's `read`. */
export const NoRead: Story = {
	args: { revoked: [READ] },
	play: async ({ canvasElement }) => {
		await within(canvasElement).findByText(DENIED_PAGE, undefined, PAGE_LOAD);
		await expect(
			within(canvasElement).queryByTestId('save-channel-button'),
		).not.toBeInTheDocument();
	},
};

/**
 * Reading is enough to open the page, so losing `update` alone leaves it
 * standing read-only: the fields go disabled and Save is locked, not hidden.
 */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectDisabled(
			await canvas.findByTestId('save-channel-button', undefined, PAGE_LOAD),
		);
		await expectDisabled(await canvas.findByTestId('slack-channel-textbox'));
	},
};

/**
 * A test send is a create on the collection, so the Test button is locked
 * while saving the channel still works.
 */
export const NoCreate: Story = {
	args: { revoked: [CREATE] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectDisabled(
			await canvas.findByTestId('test-channel-button', undefined, PAGE_LOAD),
		);
		await expectDisabled(
			await canvas.findByTestId('save-channel-button', undefined, PAGE_LOAD),
			false,
		);
	},
};

/** No channel permission at all: the page is denied before the form exists. */
export const NoChannelAccess: Story = {
	args: { revoked: NOTIFICATION_CHANNEL },
	play: NoRead.play,
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
 * The permission check failing rather than denying: the form renders editable
 * and the API decides on save.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		const save = await within(canvasElement).findByTestId(
			'save-channel-button',
			undefined,
			PAGE_LOAD,
		);

		await waitFor(() => expect(save).toBeEnabled(), PAGE_LOAD);
	},
};
