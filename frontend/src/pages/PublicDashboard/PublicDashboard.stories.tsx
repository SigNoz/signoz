import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { publicDashboardMocks } from './PublicDashboard.stories.mocks';

import PublicDashboardPage from './index';

type PublicDashboardArgs = PageStoryArgs<typeof publicDashboardMocks>;

const pageStory = storyMocks(publicDashboardMocks);

/**
 * A dashboard as an anonymous viewer sees it through a public link: the public
 * endpoints answer, and there is no shell around it.
 *
 * Route: `/public/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Public',
	component: PublicDashboardPage,
	decorators: [withAppLayout],
	// The published id comes out of the pathname, so the viewer renders under its
	// own route rather than being mounted on its own. The layout drops the app
	// chrome on this path, which is what a signed-out viewer sees.
	render: (): JSX.Element => (
		<Route path={ROUTES.PUBLIC_DASHBOARD} component={PublicDashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PublicDashboardArgs>;

export default meta;

type Story = StoryObj<PublicDashboardArgs>;

/**
 * A published dashboard as an outside viewer sees it: the SigNoz brand, the
 * dashboard's sections and panels read-only, and the time picker the publisher
 * left enabled.
 */
export const Default: Story = {};

/** The publisher pinned the window, so the viewer cannot change it. */
export const FixedTimeRange: Story = {
	args: { timeRange: false },
};

/** A dashboard saved before the Perses spec, which falls back to the v1 viewer. */
export const LegacySchema: Story = {
	args: { schema: 'v1' },
};

/** The link after it was unpublished, or one that never existed. */
export const Unpublished: Story = {
	args: { unpublished: true },
};
