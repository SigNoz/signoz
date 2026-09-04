import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { volumesMocks } from './Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type VolumesArgs = PageStoryArgs<typeof volumesMocks>;

const pageStory = storyMocks(volumesMocks);

/**
 * The Kubernetes volumes tab: capacity, used and available per persistent volume
 * claim.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=volumes`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Volumes',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<VolumesArgs>;

export default meta;

/**
 * Persistent volume claims by namespace, with usage against capacity and the
 * inode counts beside it. The volume drawer hides its tab strip, so it opens on
 * the metrics widgets and stays there.
 */
export const Default: StoryObj<VolumesArgs> = {};
