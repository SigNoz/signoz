import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { celeryTaskMocks } from './CeleryTask.stories.mocks';

import MessagingQueuesMainPage from '../../MessagingQueuesMainPage';

type CeleryTaskArgs = PageStoryArgs<typeof celeryTaskMocks>;

const pageStory = storyMocks(celeryTaskMocks, { layout: 'app' });

/**
 * Celery tasks over the period as a read-only system dashboard: Flower's active
 * tasks per worker, then task states, latency and errors from task spans,
 * filtered by the Task variable.
 *
 * Route: `/messaging-queues/celery-task`.
 */
const meta = {
	title: 'Pages/Messaging Queues/Celery',
	component: MessagingQueuesMainPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CeleryTaskArgs>;

export default meta;

type Story = StoryObj<CeleryTaskArgs>;

/**
 * The celery tab: Flower's active tasks per worker up top, then every task run
 * by state, latency per task and per-worker rate, errors and latency.
 */
export const Default: Story = {};

/** A run where a fifth of the tasks fail and a quarter are retried. */
export const FailingTasks: Story = {
	args: { health: 'failing' },
};

/** Flower not scraped: the active tasks chart is empty, the span charts still draw. */
export const NoFlowerMetrics: Story = {
	args: { flower: false },
};
