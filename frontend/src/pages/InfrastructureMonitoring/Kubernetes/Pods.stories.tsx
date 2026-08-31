import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { podsMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type PodsArgs = PageStoryArgs<typeof podsMocks>;

const pageStory = storyMocks(podsMocks);

/**
 * The Kubernetes pods tab: status, restarts and age beside CPU and memory read
 * against the pod's own request and limit. The drawer adds the pod's events.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=pods`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Pods',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PodsArgs>;

export default meta;

/**
 * Pods across every namespace: the status pill, restart count and age beside the
 * CPU and memory columns, each of those reading against the pod's own request and
 * limit. The drawer adds the events tab, which is the pod's Kubernetes events.
 */
export const Default: StoryObj<PodsArgs> = {};
