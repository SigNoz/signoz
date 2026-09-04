import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { queueOverviewMocks } from './Overview.stories.mocks';

import MessagingQueuesMainPage from '../MessagingQueuesMainPage';

type OverviewArgs = PageStoryArgs<typeof queueOverviewMocks>;

const pageStory = storyMocks(queueOverviewMocks);

/**
 * Queues with their producers and consumers over the period, failing ones first.
 *
 * Route: `/messaging-queues/overview`.
 */
const meta = {
	title: 'Pages/Messaging Queues/Overview',
	tags: ['play'],
	component: MessagingQueuesMainPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<OverviewArgs>;

export default meta;

type Story = StoryObj<OverviewArgs>;

/** The table fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * Every producer and consumer the workspace traces, across brokers: error rate,
 * p95 and throughput per service, span and destination.
 */
export const Default: Story = {};

/** The same table when a third of the queues are erroring. */
export const FailingQueues: Story = {
	args: { failing: true },
};

/** One queue opened up: its rate, error rate and latency over the range. */
export const QueueDetails: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		// Every row opens the same panel, so the first one will do. The header row
		// and antd's zero-height measuring row both answer to the row role, and the
		// header is there before the fetch returns, so waiting on the role alone
		// resolves against a table that has no data in it yet.
		const firstRow = await waitFor(() => {
			const [row] = within(canvasElement)
				.getAllByRole('row')
				.filter((candidate) => candidate.classList.contains('ant-table-row'));

			if (!row) {
				throw new Error('the queue table has not rendered a row yet');
			}

			return row;
		}, untilLoaded);

		// The click handler is on the row, and a click routed at one of its cells
		// does not reach it.
		await userEvent.click(firstRow);
		await screen.findByText('Request Rate', undefined, untilLoaded);
	},
};
