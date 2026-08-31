import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { liveLogsMocks } from './LiveLogs.stories.mocks';

import LogsModulePage from '../../LogsModulePage';

type LiveLogsArgs = PageStoryArgs<typeof liveLogsMocks>;

const pageStory = storyMocks(liveLogsMocks, { layout: 'app' });

/** The page connects before it renders a line, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Live tail is reached through the time picker, which owns the `Live` option. */
const goLive = async (canvasElement: HTMLElement): Promise<void> => {
	const canvas = within(canvasElement);

	const timePicker = await waitFor(() => {
		const input = canvasElement.querySelector<HTMLElement>(
			'.timeSelection-input',
		);

		if (!input) {
			throw new Error('Time picker did not render');
		}

		return input;
	}, untilLoaded);

	await userEvent.click(timePicker);
	await userEvent.click(
		await canvas.findByRole('button', { name: 'Live' }, untilLoaded),
	);
};

/**
 * Live tail: the explorer following a filter as lines arrive, over the log
 * stream at `/api/v3/logs/livetail` rather than a query. It is a mode of the
 * explorer rather than a page of its own, and nothing in the URL says it is on,
 * so every story here turns it on the way someone does.
 *
 * Route: `/logs/logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Live Tail',
	tags: ['play'],
	component: LogsModulePage,
	play: async ({ mount, args, canvasElement }): Promise<void> => {
		await mount();
		await goLive(canvasElement);

		// The stream answers after a connect delay, so without this the story is
		// captured on `Fetching live logs...` rather than on the lines it names.
		if (args.liveLogs > 0) {
			await within(canvasElement).findAllByText(
				/order 8412 placed/,
				undefined,
				untilLoaded,
			);
		}
	},
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LiveLogsArgs>;

export default meta;

type Story = StoryObj<LiveLogsArgs>;

/**
 * The explorer live-tailing a service: the lines the connection has delivered,
 * newest on top, with the pause control beside the time picker.
 */
export const Default: Story = {};

/** Connected with nothing through yet, which is where every live tail starts. */
export const Waiting: Story = {
	args: { liveLogs: 0 },
};
