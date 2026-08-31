import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { clustersMocks } from '../Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../../InfrastructureMonitoringPage';

type ClustersArgs = PageStoryArgs<typeof clustersMocks>;

const pageStory = storyMocks(clustersMocks, { layout: 'app' });

/**
 * The Kubernetes clusters tab: CPU, memory and pod counts per cluster, each row
 * opening the drawer.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=clusters`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Clusters',
	component: InfrastructureMonitoringPage,
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

/**
 * The tooltips of the cluster's details drawer: one per counts card, each naming
 * the cluster it would filter the namespaces, nodes or workloads by, the cluster
 * name above them, and on every metrics chart the header's own paragraph, its
 * docs link, the Go to Metrics Explorer button and the series names in the
 * legend. The counts cards are the clusters and namespaces tabs only, so this is
 * where they are reviewable.
 */
export const Tooltips: StoryObj<ClustersArgs> = {
	args: { tooltipsOpen: true, drawer: true },
};
