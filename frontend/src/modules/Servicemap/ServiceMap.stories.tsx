import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { serviceMapMocks } from './ServiceMap.stories.mocks';

import ServiceMapContainer from './index';

type ServiceMapArgs = PageStoryArgs<typeof serviceMapMocks>;

const pageStory = storyMocks(serviceMapMocks);

/**
 * Service to service calls as a force graph over `/api/v1/dependency_graph`,
 * nodes sized by request rate and coloured by error rate, each opening its own
 * side panel.
 *
 * Route: `/service-map`.
 */
const meta = {
	title: 'Pages/Services/Service Map',
	tags: ['beta', 'play'],
	component: ServiceMapContainer,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServiceMapArgs>;

export default meta;

type Story = StoryObj<ServiceMapArgs>;

/** The keys are only fetched once the select opens, past the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The whole topology: one node per service, sized by how many calls it takes,
 * red where those calls are failing, and a link per dependency carrying the
 * latency and error rate its tooltip reports.
 */
export const Default: Story = {};

/**
 * The map narrowed to one environment and one cluster: the environment selector
 * carries the first, a chip carries the second, and the graph is what is left.
 */
export const Filtered: Story = {
	args: { filters: ['environment', 'cluster'] },
};

/** A workspace with no dependencies recorded in the selected time range. */
export const NoServices: Story = {
	args: { services: 0 },
};

/**
 * The attribute filter open: of everything the endpoint returns, the map only
 * offers the three keys it can send to `/dependency_graph`.
 */
export const FilterAttributes: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const filter = canvas.getByTestId('resource-attributes-filter');

		// The select opens on a press inside it: a click on the wrapper the test id
		// sits on never reaches the handler that opens the list.
		await userEvent.click(within(filter).getByRole('combobox'));
		await canvas.findByText('k8s.cluster.name', undefined, untilLoaded);
	},
};
