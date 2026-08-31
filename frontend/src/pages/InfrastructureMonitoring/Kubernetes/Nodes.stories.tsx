import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { nodesMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type NodesArgs = PageStoryArgs<typeof nodesMocks>;

const pageStory = storyMocks(nodesMocks);

/**
 * The Kubernetes nodes tab: allocatable against used CPU and memory, and the
 * node's condition.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=nodes`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Nodes',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<NodesArgs>;

export default meta;

/**
 * Nodes of the cluster, with the Ready and Not Ready condition counts, the pods
 * scheduled on each and CPU and memory read against what the node has left to
 * allocate.
 */
export const Default: StoryObj<NodesArgs> = {};
