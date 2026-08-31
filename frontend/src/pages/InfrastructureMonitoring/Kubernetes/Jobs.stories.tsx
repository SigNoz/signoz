import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { jobsMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type JobsArgs = PageStoryArgs<typeof jobsMocks>;

const pageStory = storyMocks(jobsMocks);

/**
 * The Kubernetes jobs tab: active, succeeded and failed pods per job, and how long
 * each has been running.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=jobs`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Jobs',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<JobsArgs>;

export default meta;

/**
 * Jobs by namespace, with active, failed and successful pods against the
 * completions the job asked for. The drawer adds the by-pod metrics tab.
 */
export const Default: StoryObj<JobsArgs> = {};
