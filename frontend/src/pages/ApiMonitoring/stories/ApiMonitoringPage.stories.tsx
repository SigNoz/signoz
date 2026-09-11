import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { apiMonitoringMocks } from './ApiMonitoringPage.stories.mocks';
import ApiMonitoringPage from '../ApiMonitoringPage';

type ApiMonitoringArgs = PageStoryArgs<typeof apiMonitoringMocks>;

const pageStory = storyMocks(apiMonitoringMocks, { layout: 'app' });

/**
 * Third party domains instrumented services call, their endpoints, status codes
 * and the services depending on them. The domain drawer is part of the route, so
 * it is a control rather than a play.
 *
 * Route: `/api-monitoring/explorer`.
 */
const meta = {
	title: 'Pages/External APIs',
	tags: ['play'],
	component: ApiMonitoringPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ApiMonitoringArgs>;

export default meta;

type Story = StoryObj<ApiMonitoringArgs>;

/**
 * Every external host the workspace called in the window, with the endpoints it
 * uses, how often, how slow and how much of it failed. Clicking a row opens the
 * domain drawer.
 */
export const Default: Story = {};

/**
 * The domain drawer on All Endpoints: the host's own rate, latency and error
 * share above a table of every endpoint under it, groupable by any span
 * attribute.
 */
export const DomainEndpoints: Story = {
	args: { drawer: 'all-endpoints' },
};

/** The endpoint drawer scoped to checkout, which hides dependent services. */
export const ServiceFiltered: Story = {
	args: { drawer: 'endpoint-stats', serviceFilter: true },
};

/** A non-standard-port destination, preserving the endpoint metadata pill. */
export const PortDomain: Story = {
	args: { drawer: 'endpoint-stats', drawerDomain: 'ip-address' },
};

/** The page fetches before it renders a filter, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The quick-filter panel has no test id of its own, and it only mounts once the
 * workspace's filters have answered.
 */
const selectFirstQuickFilterValue = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	const panel = await waitFor(() => {
		const found = canvasElement.querySelector<HTMLElement>('.quick-filters');

		if (!found) {
			throw new Error('Quick filters did not render');
		}

		return found;
	}, untilLoaded);

	// The V2 checkbox panel starts with every value selected, so its checkbox only
	// toggles an exclusion. The value's own label is what selects it on its own
	// ("Only"), which is the state this story shows.
	const [row] = await within(panel).findAllByTestId(
		/^checkbox-value-row-/,
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(row).getAllByRole('button')[0]);

	// The panel re-renders around the new query, so the checkbox is looked up
	// again on every attempt rather than held from before the click.
	await waitFor(
		() => expect(within(panel).getAllByRole('checkbox')[0]).toBeChecked(),
		untilLoaded,
	);
};

/** The domain drawer's real empty endpoint-table branch. */
export const EmptyEndpointDrawer: Story = {
	args: { drawer: 'all-endpoints', endpoints: 0 },
};

/** A selected API Monitoring quick-filter value. */
export const QuickFilterSelected: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await selectFirstQuickFilterValue(canvasElement);
	},
};

/**
 * One endpoint's stats: the services calling it, the codes it answered with as
 * a chart and a table, and its rate and latency over the window.
 */
export const EndpointStats: Story = {
	args: { drawer: 'endpoint-stats' },
};

/**
 * The ten errors the domain returned most, by endpoint, status code and the
 * message that came back. A row opens the traces behind it.
 */
export const TopErrors: Story = {
	args: { drawer: 'top-errors' },
};

/**
 * A domain answering almost every call with an error, which is what the drawer
 * looks like when the host is the problem.
 */
export const FailingDomain: Story = {
	args: { drawer: 'endpoint-stats', drawerDomain: 'failing' },
};

/**
 * Nothing instrumented yet: no client spans carrying a URL, so the page explains
 * what to send instead of listing hosts.
 */
export const NoExternalCalls: Story = {
	args: { domains: 0 },
};

/** The domain list mid-query, with the cancel action the toolbar offers. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
