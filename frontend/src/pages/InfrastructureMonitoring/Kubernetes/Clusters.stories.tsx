import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { clustersMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type ClustersArgs = PageStoryArgs<typeof clustersMocks>;

const pageStory = storyMocks(clustersMocks);

/**
 * The Kubernetes clusters tab: CPU, memory and pod counts per cluster, each row
 * opening the drawer.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=clusters`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Clusters',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ClustersArgs>;

export default meta;

/**
 * Clusters with their node readiness and pod status counts, and CPU and memory
 * against the cluster's allocatable capacity. The drawer carries the counts cards
 * that jump to the nodes and pods of the cluster.
 */
export const Default: StoryObj<ClustersArgs> = {};
