import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { publicDashboardMocks } from './PublicDashboard.stories.mocks';

import PublicDashboardPage from '../index';

type PublicDashboardArgs = PageStoryArgs<typeof publicDashboardMocks>;

const pageStory = storyMocks(publicDashboardMocks, { layout: 'app' });

/**
 * A dashboard as an anonymous viewer sees it through a public link: the public
 * endpoints answer, and there is no shell around it.
 *
 * Route: `/public/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Public',
	tags: ['play'],
	component: PublicDashboardPage,
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

/** The viewer fetches the dashboard before it renders its header. */
const untilLoaded = { timeout: 15_000 };

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

/** Panels resolve successfully but have no matching data. */
export const NoData: Story = {
	args: { noData: true },
};

/** The viewer shell and header remain while the panel queries are loading. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** The public viewer's auto-refresh popover is visibly open. */
export const AutoRefreshMenuOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByTestId(
				'public-dashboard-auto-refresh',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText('Refresh Interval', undefined, untilLoaded);
	},
};

/** A dashboard saved before the Perses spec, which falls back to the v1 viewer. */
export const LegacySchema: Story = {
	args: { schema: 'v1' },
};

/** The link after it was unpublished, or one that never existed. */
export const Unpublished: Story = {
	args: { unpublished: true },
};
