import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardMocks } from './DashboardPageV2.stories.mocks';

import DashboardPageV2 from './DashboardPageV2';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks);

/**
 * One dashboard: its variables, its sections and every panel querying
 * `query_range`, plus the lock, clone and publish actions in the header.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail',
	tags: ['role-gated'],
	component: DashboardPageV2,
	decorators: [withAppLayout],
	// The page reads the dashboard id out of the pathname, so it renders under
	// its own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPageV2} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

/**
 * A service dashboard with data: the variable bar over two titled sections, and
 * the panel kinds all drawn from the same query endpoint: time series, single
 * numbers, a table, a bar chart, a pie and a log list.
 */
export const Default: Story = {};

/**
 * The blank dashboard a freshly created one starts as, with the two steps that
 * populate it. A titled section renders its own add-panel state instead, so this
 * needs both no panels and no sections.
 */
export const Empty: Story = {
	args: { panels: 0, sectioned: false },
};

/**
 * A locked dashboard: the lock indicator sits over the grid and the edit
 * affordances are gone even for an admin.
 */
export const Locked: Story = {
	args: { locked: true },
};

/**
 * A viewer: the panels and the variable bar work, but nothing that would change
 * the dashboard is offered.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/**
 * Every query ran and matched nothing, which each panel kind draws as its own
 * no-data state.
 */
export const NoData: Story = {
	args: { noData: true },
};

/** The panels mid-fetch, with the header, variable bar and grid already laid out. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** A dashboard id nobody has, which is what a deleted or mistyped link opens on. */
export const NotFound: Story = {
	args: { notFound: true },
};
