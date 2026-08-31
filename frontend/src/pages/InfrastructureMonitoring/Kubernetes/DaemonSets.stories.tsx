import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { daemonSetsMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type DaemonSetsArgs = PageStoryArgs<typeof daemonSetsMocks>;

const pageStory = storyMocks(daemonSetsMocks);

/**
 * The Kubernetes daemon sets tab: desired against ready nodes, with CPU and
 * memory beside them.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=daemonsets`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/DaemonSets',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DaemonSetsArgs>;

export default meta;

/**
 * DaemonSets by namespace: ready, current, desired and misscheduled nodes beside
 * the CPU and memory of the pods they run. The drawer adds the by-pod metrics
 * tab.
 */
export const Default: StoryObj<DaemonSetsArgs> = {};
