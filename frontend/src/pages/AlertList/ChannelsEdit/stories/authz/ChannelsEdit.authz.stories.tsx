import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	CREATE,
	DELETE,
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
		// Save is also off until the form is edited, so the edit comes first and
		// what is left is the permission.
		await userEvent.type(
			await canvas.findByTestId('slack-channel-textbox', undefined, PAGE_LOAD),
			'-edited',
		);
		await expectDisabled(
			await canvas.findByTestId('save-channel-button', undefined, PAGE_LOAD),
			false,
		);
	},
};

/**
 * The viewer: `read` and nothing else. The page opens, every field is off, and
 * both Save and Test are locked rather than hidden.
 */
export const ReadOnly: Story = {
	args: { revoked: [UPDATE, CREATE, DELETE] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectDisabled(
			await canvas.findByTestId('save-channel-button', undefined, PAGE_LOAD),
		);
		await expectDisabled(await canvas.findByTestId('test-channel-button'));
		await expectDisabled(await canvas.findByTestId('slack-channel-textbox'));
	},
};

/**
 * The same denial on a Telegram channel. Its fields are the kind the form gained
 * last, including the only toggle a settings panel renders, so this is where a
 * gap in the gating would show first.
 *
 * The switch is checked by behaviour, not by an attribute: it is a button inside
 * the disabled fieldset, so it carries no `disabled` of its own and an
 * attribute check would pass whether or not the browser actually turned it off.
 */
export const TelegramReadOnly: Story = {
	args: { channelType: 'telegram', revoked: [UPDATE, CREATE, DELETE] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectDisabled(
			await canvas.findByTestId(
				'telegram-bot-token-textbox',
				undefined,
				PAGE_LOAD,
			),
		);
		await expectDisabled(await canvas.findByTestId('telegram-chat-id-textbox'));
		await expectDisabled(await canvas.findByTestId('telegram-message-textarea'));

		const toggle = await canvas.findByTestId(
			'telegram-disable-notifications-switch',
		);
		const before = toggle.getAttribute('aria-checked');
		await userEvent.click(toggle);
		await expect(toggle.getAttribute('aria-checked')).toBe(before);
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
		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByTestId('slack-channel-textbox', undefined, PAGE_LOAD),
			'-edited',
		);

		await expectDisabled(canvas.getByTestId('save-channel-button'), false);
	},
};
