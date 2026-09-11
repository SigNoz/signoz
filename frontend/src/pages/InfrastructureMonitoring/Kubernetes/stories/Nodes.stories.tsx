import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { nodesMocks } from '../Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../../InfrastructureMonitoringPage';

type NodesArgs = PageStoryArgs<typeof nodesMocks>;

const pageStory = storyMocks(nodesMocks, { layout: 'app' });

/**
 * The Kubernetes nodes tab: allocatable against used CPU and memory, and the
 * node's condition.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=nodes`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Nodes',
	tags: ['play'],
	component: InfrastructureMonitoringPage,
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

/**
 * Every tooltip the node list carries, held open over a hovered row: the Pod
 * Status cell, whose tooltip is a count per phase and only exists while the row
 * is hovered, beside the column headers sharing the generic note and the
 * Collapse Filters and Options buttons. The pod list renders its own count cells
 * only once grouped, so this is where that breakdown is reviewable.
 */
export const Tooltips: StoryObj<NodesArgs> = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.hover(
			await canvas.findByText('ip-10-0-1-24-1', {}, { timeout: 10000 }),
		);
		// The pod-status breakdown is only rendered for the hovered row.
		await screen.findByText('Running: 8', {}, { timeout: 10000 });
	},
};
