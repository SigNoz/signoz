import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	type CeleryTaskArgs,
	celeryTaskMocks,
} from './CeleryTask.stories.mocks';
import {
	openStateDrawer,
	showFailedTasks,
} from './__story_mockdata__/celeryTask.play';

import MessagingQueuesMainPage from '../../MessagingQueuesMainPage';

const pageStory = storyMocks(celeryTaskMocks, { layout: 'app' });

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
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CeleryTaskArgs>;

export default meta;

type Story = StoryObj<CeleryTaskArgs>;

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
	play: showFailedTasks,
};

/** A click on the state graph opens the drawer for that state: its slowest tasks over the clicked minute. */
export const StateDrawer: Story = {
	play: openStateDrawer,
};

/** Flower not scraped: the worker card counts nothing and its charts are empty. */
export const NoFlowerMetrics: Story = {
	args: { workers: 0 },
};
