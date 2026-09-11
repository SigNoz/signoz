import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';
import { VIEWS } from 'container/InfraMonitoringK8sV2/constants';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { podLongNodeName, podsMocks } from '../Kubernetes.stories.mocks';

import InfrastructureMonitoringPage from '../../InfrastructureMonitoringPage';

type PodsArgs = PageStoryArgs<typeof podsMocks>;

const pageStory = storyMocks(podsMocks, { layout: 'app' });

/**
 * The Kubernetes pods tab: status, restarts and age beside CPU and memory read
 * against the pod's own request and limit. The drawer adds the pod's events.
 *
 * Route: `/infrastructure-monitoring/kubernetes?category=pods`.
 */
const meta = {
	title: 'Pages/Infrastructure/Kubernetes/Pods',
	tags: ['play'],
	component: InfrastructureMonitoringPage,
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

/** The selected pod's Kubernetes events tab, opened through its detail route. */
export const PodDetailsEvents: StoryObj<PodsArgs> = {
	args: { drawer: true, drawerTab: VIEWS.EVENTS },
};

/**
 * Every tooltip the pod list carries, held open: Collapse Filters beside the
 * quick filters, Options above the table, the Pod Name, Status, Age and Restarts
 * headers sharing the generic note and its docs link, and the CPU and memory
 * limit headers, whose tooltip is the whole threshold legend rather than a
 * sentence. The matching request columns are hidden until the Options panel adds
 * them, and their legend is the same shape.
 */
export const Tooltips: StoryObj<PodsArgs> = {
	args: { tooltipsOpen: true },
};

/**
 * The tooltips of the pod's details drawer on its logs tab: the namespace,
 * cluster and node metadata values, the node one long enough to wrap, and the
 * Go to Logs Explorer button beside the tab strip, with the list's own header
 * tooltips still open behind the drawer.
 */
export const TooltipsInDetailsDrawer: StoryObj<PodsArgs> = {
	args: { tooltipsOpen: true, drawer: true, drawerTab: VIEWS.LOGS },
	parameters: { msw: { handlers: [podLongNodeName] } },
};

/**
 * The Options panel over the list: the tooltip on the disabled switch of the
 * column the table cannot do without, and, because the panel lists the columns
 * the table is hiding, the CPU and memory request threshold legends the list
 * itself never renders.
 */
export const TooltipsInOptionsPanel: StoryObj<PodsArgs> = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId(
				'k8s-table-options-button',
				{},
				{ timeout: 10000 },
			),
		);

		await screen.findByText('Columns');
	},
};
