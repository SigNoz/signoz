import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { namespacesMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type NamespacesArgs = PageStoryArgs<typeof namespacesMocks>;

const pageStory = storyMocks(namespacesMocks);

/**
 * The Kubernetes namespaces tab: CPU and memory aggregated per namespace, each row
 * opening the drawer.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=namespaces`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Namespaces',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<NamespacesArgs>;

export default meta;

/**
 * Namespaces with the pod counts by status behind each one. The drawer carries
 * the counts cards that jump back to this list filtered, plus the by-pod metrics
 * tab.
 */
export const Default: StoryObj<NamespacesArgs> = {};
