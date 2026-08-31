import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { deploymentsMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type DeploymentsArgs = PageStoryArgs<typeof deploymentsMocks>;

const pageStory = storyMocks(deploymentsMocks);

/**
 * The Kubernetes deployments tab: desired against available replicas, with CPU and
 * memory against request and limit.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=deployments`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Deployments',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DeploymentsArgs>;

export default meta;

/**
 * Deployments by namespace: available against desired pods, the replica count and
 * the pod status counts. The drawer adds the by-pod metrics tab, one series per
 * pod of the deployment.
 */
export const Default: StoryObj<DeploymentsArgs> = {};
