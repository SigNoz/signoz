import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { statefulSetsMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type StatefulSetsArgs = PageStoryArgs<typeof statefulSetsMocks>;

const pageStory = storyMocks(statefulSetsMocks);

/**
 * The Kubernetes stateful sets tab: desired against ready replicas, with CPU and
 * memory beside them.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=statefulsets`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/StatefulSets',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<StatefulSetsArgs>;

export default meta;

/**
 * StatefulSets by namespace: current against desired pods, the replica count and
 * the pod status counts. The drawer adds the by-pod metrics tab.
 */
export const Default: StoryObj<StatefulSetsArgs> = {};
