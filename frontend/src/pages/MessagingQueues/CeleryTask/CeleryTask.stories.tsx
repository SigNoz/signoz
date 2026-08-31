import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { celeryTaskMocks } from './CeleryTask.stories.mocks';

import MessagingQueuesMainPage from '../MessagingQueuesMainPage';

type CeleryTaskArgs = PageStoryArgs<typeof celeryTaskMocks>;

const pageStory = storyMocks(celeryTaskMocks);

/**
 * Celery tasks over the period: state per task, the workers running them, and the
 * slowest and failing ones.
 *
 * Route: `/messaging-queues/celery-task`.
 */
const meta = {
	title: 'Pages/Messaging Queues/Celery',
	tags: ['play'],
	component: MessagingQueuesMainPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CeleryTaskArgs>;

export default meta;

type Story = StoryObj<CeleryTaskArgs>;

/** The counters fetch before the tabs settle, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The celery tab: flower's per-worker metrics up top, then the span-based view
 * of every task run, split by state and broken down per worker.
 */
export const Default: Story = {};

/** A run where a fifth of the tasks fail and a quarter are retried. */
export const FailingTasks: Story = {
	args: { health: 'failing' },
};

/** The state graph narrowed to the runs that failed, over the same range. */
export const FailedTasksOnly: Story = {
	args: { health: 'failing' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText('Failed', undefined, untilLoaded),
		);
	},
};

/** Flower not scraped: the worker card counts nothing and its charts are empty. */
export const NoFlowerMetrics: Story = {
	args: { workers: 0 },
};
