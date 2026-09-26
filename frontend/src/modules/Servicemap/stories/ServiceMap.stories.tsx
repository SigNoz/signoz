import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	expect,
	fireEvent,
	screen,
	userEvent,
	waitFor,
	within,
} from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { serviceMapMocks } from './ServiceMap.stories.mocks';

import ServiceMapContainer from '../index';

type ServiceMapArgs = PageStoryArgs<typeof serviceMapMocks>;

const pageStory = storyMocks(serviceMapMocks, { layout: 'app' });

/**
 * Service to service calls as a force graph over `/api/v1/dependency_graph`,
 * nodes sized by request rate and coloured by error rate, with link details on
 * hover.
 *
 * Route: `/service-map`.
 */
const meta = {
	title: 'Pages/Services/Service Map',
	tags: ['beta', 'play'],
	component: ServiceMapContainer,
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

/** A topology without service errors, preserving the healthy node treatment. */
export const HealthyTopology: Story = {
	args: { health: 'healthy' },
};

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

/** The filter's real empty branch when no resource attributes have been ingested. */
export const NoResourceAttributes: Story = {
	args: { resourceAttributes: false },
	play: async ({ canvasElement }): Promise<void> => {
		const filter = await within(canvasElement).findByTestId(
			'resource-attributes-filter',
			undefined,
			untilLoaded,
		);

		await userEvent.click(within(filter).getByRole('combobox'));
		await screen.findByText(
			/No resource attributes available to filter/i,
			undefined,
			untilLoaded,
		);
	},
};

/**
 * The attribute filter open: of everything the endpoint returns, the map only
 * offers the three keys it can send to `/dependency_graph`.
 */
export const FilterAttributes: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		const filter = await canvas.findByTestId(
			'resource-attributes-filter',
			undefined,
			untilLoaded,
		);

		// The select opens on a press inside it: a click on the wrapper the test id
		// sits on never reaches the handler that opens the list.
		await userEvent.click(within(filter).getByRole('combobox'));
		await screen.findByText('k8s.cluster.name', undefined, untilLoaded);
	},
};

/** Opens the select under a test id; it closes again after every pick. */
const openSelect = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const select = await within(canvasElement).findByTestId(
		testId,
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(select).getByRole('combobox'));
};

const OPEN_DROPDOWN = '.ant-select-dropdown:not(.ant-select-dropdown-hidden)';

/** antd keeps a hidden copy of each label for screen readers; the title skips it. */
const visibleOption = (title: string): HTMLElement | null =>
	document.querySelector<HTMLElement>(
		`${OPEN_DROPDOWN} .ant-select-item-option[title="${title}"]`,
	);

/**
 * Picks the option titled `title` in the open dropdown. `userEvent.click`
 * moves focus off the select on the way, which closes it before the option
 * takes the click.
 */
const pickOption = async (title: string): Promise<void> => {
	const option = await waitFor(() => {
		const match = visibleOption(title);

		if (!match) {
			throw new Error(`option "${title}" not found`);
		}

		return match;
	}, untilLoaded);

	await fireEvent.click(option);
};

/**
 * Opens the attribute filter on its next step. Each single-choice pick closes
 * the dropdown and swaps the select for the next step's, and a click that lands
 * before the swap opens nothing, so it opens again until `title` shows.
 */
const openAttributeFilterOn = (
	canvasElement: HTMLElement,
	title: string,
): Promise<void> =>
	waitFor(
		async () => {
			if (visibleOption(title)) {
				return;
			}

			if (!document.querySelector(OPEN_DROPDOWN)) {
				await openSelect(canvasElement, 'resource-attributes-filter');
			}

			throw new Error(`option "${title}" not shown`);
		},
		{ ...untilLoaded, interval: 500 },
	);

/** Stages `k8s.cluster.name IN` and leaves the filter open on its values. */
const stageClusterIn = async (canvasElement: HTMLElement): Promise<void> => {
	await openAttributeFilterOn(canvasElement, 'k8s.cluster.name');
	await pickOption('k8s.cluster.name');
	await openAttributeFilterOn(canvasElement, 'IN');
	await pickOption('IN');
	await openAttributeFilterOn(canvasElement, 'staging-eu');
};

/** A key staged as a chip, the filter open again on how to match it. */
export const FilterOperators: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openAttributeFilterOn(canvasElement, 'k8s.cluster.name');
		await pickOption('k8s.cluster.name');
		await openAttributeFilterOn(canvasElement, 'Not IN');
	},
};

/** A key and `IN` staged, the filter open on the values the key holds. */
export const FilterValues: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await stageClusterIn(canvasElement);
	},
};

/** Two values ticked before the filter is left, which is what applies it. */
export const FilterValuesSelected: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await stageClusterIn(canvasElement);
		await pickOption('prod-us-east');
		await pickOption('prod-eu-west');
		await waitFor(
			() =>
				expect(
					document.querySelectorAll('.ant-select-item-option-selected'),
				).toHaveLength(2),
			untilLoaded,
		);
	},
};

/** The environment selector open on the environments the calls came from. */
export const EnvironmentOptions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openSelect(canvasElement, 'resource-environment-filter');
		await waitFor(
			() =>
				expect(
					document.querySelector(`${OPEN_DROPDOWN} .ant-select-item-option`),
				).not.toBeNull(),
			untilLoaded,
		);
	},
};
