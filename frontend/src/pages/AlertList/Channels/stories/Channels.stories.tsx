import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelsMocks } from './Channels.stories.mocks';

import AlertList from '../../index';

type ChannelsArgs = PageStoryArgs<typeof channelsMocks>;

const pageStory = storyMocks(channelsMocks, { layout: 'app' });

/**
 * Notification channels tab: what a rule can notify, one row per channel.
 * Search, the type filter and paging all run against the API, so each one is
 * a request rather than a filter over rows already on screen.
 *
 * Route: `/alerts?tab=Channels`.
 */
const meta = {
	title: 'Pages/Alerts/Channels/List',
	tags: ['play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ChannelsArgs>;

export default meta;

type Story = StoryObj<ChannelsArgs>;

/** The list settles after its own request, so the first row outlives the default wait. */
const UNTIL_LOADED = { timeout: 15_000 };

/**
 * A row's permission check only starts once its menu is open, so the items are
 * disabled for a moment and a click into that gap lands on nothing.
 */
const clickRowAction = async (name: string): Promise<void> => {
	const item = await screen.findByRole('menuitem', { name }, UNTIL_LOADED);

	await waitFor(() => {
		void expect(item).not.toHaveAttribute('aria-disabled', 'true');
		void expect(item.closest('[data-disabled]')).toBeNull();
	}, UNTIL_LOADED);

	await userEvent.click(item);
};

/**
 * Where notifications go: every configured channel with the integration it
 * sends through, when it was made and when it last changed.
 */
export const Default: Story = {};

/** A workspace with nowhere to send an alert yet. */
export const NoChannels: Story = {
	args: { channels: 0 },
};

/** Data: the channel list's existing loading spinner. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Data: the channel list's retryable request-error branch. */
export const LoadError: Story = {
	args: { dataState: 'error' },
	// The mocked channels request intentionally fails; the resulting console error
	// is the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/** Interaction: typing a name narrows the list to the channel that matches. */
export const Search: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('sre-email', undefined, UNTIL_LOADED);
		await userEvent.type(canvas.getByTestId('channels-search'), 'slack');

		// the table holds the previous page while the debounced request is in
		// flight, so the row going away is what says the search landed
		await waitFor(
			() => expect(canvas.queryByText('sre-email')).not.toBeInTheDocument(),
			UNTIL_LOADED,
		);
		await canvas.findByText('ops-slack');
	},
};

/** Interaction: the type filter keeps only the channels of the kind it names. */
export const KindFilter: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
		await userEvent.click(canvas.getByTestId('channels-kind-filter'));
		await userEvent.click(await screen.findByRole('option', { name: 'Email' }));

		await waitFor(
			() => expect(canvas.queryByText('ops-slack')).not.toBeInTheDocument(),
			UNTIL_LOADED,
		);
		await canvas.findByText('sre-email');
	},
};

/** Interaction: a search matching nothing offers to clear itself. */
export const NoResults: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
		await userEvent.type(
			canvas.getByTestId('channels-search'),
			'no-such-channel',
		);

		await canvas.findByText('No matching channels', undefined, UNTIL_LOADED);
		await userEvent.click(canvas.getByRole('button', { name: 'Clear Search' }));
		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
	},
};

/** Interaction: a row's actions menu, with open, JSON and delete on it. */
export const RowActions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
		await userEvent.click(
			canvas.getByRole('button', { name: 'Actions for ops-slack' }),
		);

		await screen.findByRole('menu');
		await screen.findByRole('menuitem', { name: 'View JSON' }, UNTIL_LOADED);
	},
};

/**
 * Interaction: the JSON view of a channel, with its secrets masked until the
 * toolbar is asked to reveal them.
 */
export const ChannelJson: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
		await userEvent.click(
			canvas.getByRole('button', { name: 'Actions for ops-slack' }),
		);
		await clickRowAction('View JSON');

		await screen.findByTestId('channel-json-dialog', undefined, UNTIL_LOADED);
		await screen.findByTestId('channel-json-toggle-secrets');
	},
};

/** Interaction: deleting a channel asks first, naming what stops reaching it. */
export const DeleteConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await canvas.findByText('ops-slack', undefined, UNTIL_LOADED);
		await userEvent.click(
			canvas.getByRole('button', { name: 'Actions for ops-slack' }),
		);
		await clickRowAction('Delete');

		await screen.findByText(
			'Are you sure you want to delete the ops-slack channel?',
		);
	},
};
