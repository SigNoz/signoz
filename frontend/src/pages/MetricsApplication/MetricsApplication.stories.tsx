import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import MetricsApplication from './MetricsApplication';
import { metricsApplicationMocks } from './MetricsApplication.stories.mocks';

type MetricsApplicationArgs = PageStoryArgs<typeof metricsApplicationMocks>;

const pageStory = storyMocks(metricsApplicationMocks);

/**
 * One service: its latency, rate and error panels, its top and entry point
 * operations, and the apdex setting the panels read.
 *
 * Route: `/services/:servicename`.
 */
const meta = {
	title: 'Pages/Services/Detail',
	component: MetricsApplication,
	decorators: [withAppLayout],
	// The page reads the service out of the pathname, so it renders under its own
	// route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.SERVICE_METRICS} component={MetricsApplication} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MetricsApplicationArgs>;

export default meta;

type Story = StoryObj<MetricsApplicationArgs>;

/**
 * A service's overview: latency, rate, apdex and error percentage over the
 * selected range, with the key operations behind them.
 */
export const Default: Story = {};

/** The database calls the service makes, by system and by upstream. */
export const DatabaseCalls: Story = {
	args: { tab: 'DB_CALL_METRICS' },
};

/** The calls the service makes out of the mesh, by address. */
export const ExternalCalls: Story = {
	args: { tab: 'EXTERNAL_METRICS' },
};
