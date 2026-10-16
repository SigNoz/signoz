import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	CREATE,
	DELETE,
	expectDisabled,
	LIST,
	NOTIFICATION_CHANNEL,
	PAGE_LOAD,
	READ,
	UPDATE,
} from '../../../stories/channelAuthz';
import { channelsMocks } from '../Channels.stories.mocks';

import AlertList from '../../../index';

type ChannelsArgs = PageStoryArgs<typeof channelsMocks>;

const pageStory = storyMocks(channelsMocks, { layout: 'app' });

/**
 * The channels list with one permission missing at a time. Every story here is
 * an admin denied exactly what its name says. `list` decides whether the tab
 * renders at all, `create` the New channel button, and the rest are checked per
 * row, when its Actions menu is opened.
 *
 * Route: `/alerts?tab=Channels`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/List Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsArgs>;

export default meta;

type Story = StoryObj<ChannelsArgs>;

const openRowMenu = async (canvasElement: HTMLElement): Promise<void> => {
	const [trigger] = await within(canvasElement).findAllByRole(
		'button',
		{ name: /^Actions for/ },
		PAGE_LOAD,
	);

	await userEvent.click(trigger);
	await screen.findByRole('menu', undefined, PAGE_LOAD);
};

/** The label itself waits on the row's permission check, so look it up async. */
const rowAction = (name: string): Promise<HTMLElement> =>
	screen.findByRole('menuitem', { name }, PAGE_LOAD);

/**
 * The denial takes the place of the table. The header and its filters stay, as
 * on dashboards, and go inert: the tab says why it is empty rather than
 * vanishing.
 */
export const NoList: Story = {
	args: { revoked: [LIST] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await canvas.findByText(/is not authorized/, undefined, PAGE_LOAD);
		await expectDisabled(await canvas.findByTestId('channels-search'));
	},
};

/** The list is intact and New channel stays in the header, locked. */
export const NoCreate: Story = {
	args: { revoked: [CREATE] },
	play: async ({ canvasElement }) => {
		await expectDisabled(
			await within(canvasElement).findByTestId(
				'channels-create',
				undefined,
				PAGE_LOAD,
			),
		);
	},
};

/**
 * Opening a channel needs `update` as well as `read`, so without `update` the
 * row's first action reads View rather than Edit.
 */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		await openRowMenu(canvasElement);
		await rowAction('View');
		await expect(
			screen.queryByRole('menuitem', { name: 'Edit' }),
		).not.toBeInTheDocument();
	},
};

/** The other half of the same pair, which also turns Edit into View. */
export const NoRead: Story = {
	args: { revoked: [READ] },
	play: NoUpdate.play,
};

/** Delete is locked in the row menu; View and View JSON stay open. */
export const NoDelete: Story = {
	args: { revoked: [DELETE] },
	play: async ({ canvasElement }) => {
		await openRowMenu(canvasElement);
		await expectDisabled(await rowAction('Delete'));
		await expectDisabled(await rowAction('View'), false);
		await expectDisabled(await rowAction('View JSON'), false);
	},
};

/**
 * Everything but listing: the channels are in view, New channel is locked, and
 * a row offers View and a locked Delete.
 */
export const ReadOnly: Story = {
	args: { revoked: [CREATE, UPDATE, DELETE] },
	play: async ({ canvasElement }) => {
		await expectDisabled(
			await within(canvasElement).findByTestId(
				'channels-create',
				undefined,
				PAGE_LOAD,
			),
		);
		await openRowMenu(canvasElement);
		await rowAction('View');
		await expectDisabled(await rowAction('Delete'));
	},
};

/** No channel permission at all, which is the tab with nothing on it to use. */
export const NoChannelAccess: Story = {
	args: { revoked: NOTIFICATION_CHANNEL },
	play: NoList.play,
};

/**
 * The table holds a skeleton until the permission check answers, so the list
 * does not flash in before a denial takes it away.
 */
export const CheckLoading: Story = {
	args: { authzState: 'loading' },
	play: async ({ canvasElement }) => {
		await new Promise((resolve) => {
			setTimeout(resolve, 1500);
		});
		await expect(
			canvasElement.querySelector('.ant-skeleton'),
		).toBeInTheDocument();
	},
};

/**
 * The permission check failing rather than denying: the tab renders and every
 * action stays open, so the API decides.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		await expectDisabled(
			await within(canvasElement).findByTestId(
				'channels-create',
				undefined,
				PAGE_LOAD,
			),
			false,
		);
	},
};
