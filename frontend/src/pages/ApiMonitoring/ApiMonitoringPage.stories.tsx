import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { apiMonitoringMocks } from './ApiMonitoringPage.stories.mocks';
import ApiMonitoringPage from './ApiMonitoringPage';

type ApiMonitoringArgs = PageStoryArgs<typeof apiMonitoringMocks>;

const pageStory = storyMocks(apiMonitoringMocks);

/**
 * Third party domains instrumented services call, their endpoints, status codes
 * and the services depending on them. The domain drawer is part of the route, so
 * it is a control rather than a play.
 *
 * Route: `/api-monitoring/explorer`.
 */
const meta = {
	title: 'Pages/External APIs',
	component: ApiMonitoringPage,
	decorators: [withAppLayout],
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
