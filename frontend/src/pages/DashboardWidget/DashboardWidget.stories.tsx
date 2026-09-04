import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardWidgetMocks } from './DashboardWidget.stories.mocks';

import DashboardWidget from './index';

type DashboardWidgetArgs = PageStoryArgs<typeof dashboardWidgetMocks>;

const pageStory = storyMocks(dashboardWidgetMocks);

/**
 * The widget editor a v1 dashboard opens: one query per panel type against
 * `query_range`.
 *
 * Route: `/dashboard/:dashboardId/:widgetId`.
 */
const meta = {
	title: 'Pages/Dashboards/Widget Editor',
	component: DashboardWidget,
	decorators: [withAppLayout],
	// The dashboard id comes out of the pathname and the widget out of the query
	// string, so the editor renders under its own route.
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD_WIDGET} component={DashboardWidget} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardWidgetArgs>;

export default meta;

type Story = StoryObj<DashboardWidgetArgs>;

/**
 * Where an explorer's "Add to dashboard" lands: the query it exported already in
 * the builder, the preview above it, and the panel's options on the right,
 * waiting to be saved into the dashboard.
 */
export const Default: Story = {};

/** Editing a widget the dashboard already holds, opened on its saved query. */
export const SavedWidget: Story = {
	args: { source: 'saved' },
};

/** The same export as a table, which swaps the preview and the options pane. */
export const TableWidget: Story = {
	args: { panelType: 'table' },
};
