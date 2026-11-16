import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '@/storybook/renderAtRoute';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import ServiceDetails from '../ServiceDetails';
import { openApdexSettings } from './__story_mockdata__/serviceDetails.play';
import { serviceDetailsMocks } from './ServiceDetails.stories.mocks';

type ServiceDetailsArgs = PageStoryArgs<typeof serviceDetailsMocks>;

const pageStory = storyMocks(serviceDetailsMocks, { layout: 'app' });

/**
 * One service as three read-only system dashboards: its overview (latency, rate,
 * Apdex, errors, key operations), the database calls it makes and its external
 * calls. The service and environment are the dashboard's own variables.
 *
 * Route: `/services/:servicename`, the tab control picks which tab.
 */
const meta = {
	title: 'Pages/Services/Detail',
	tags: ['play'],
	component: ServiceDetails,
	render: renderAtRoute(ROUTES.SERVICE_METRICS, ServiceDetails),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServiceDetailsArgs>;

export default meta;

type Story = StoryObj<ServiceDetailsArgs>;

/** The service's overview: latency, rate, Apdex, error percentage and its key operations. */
export const Default: Story = {};

/** The database calls the service makes, by database system. */
export const DatabaseCalls: Story = {
	args: { tab: 'DB_CALL_METRICS' },
};

/** The calls the service makes to other addresses. */
export const ExternalCalls: Story = {
	args: { tab: 'EXTERNAL_METRICS' },
};

/** A service with no traffic in the window: every panel is empty. */
export const NoTraffic: Story = {
	args: { noData: true },
};

/** A role without dashboard read access: the tab names the missing permission. */
export const NoDashboardAccess: Story = {
	args: { dashboardAccess: false },
	// The deliberate 403 is the state under test.
	parameters: { allowConsoleErrors: true },
};

/** The Apdex threshold setting, open from the header. */
export const ApdexSettingsOpen: Story = {
	play: openApdexSettings,
};
