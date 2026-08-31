import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks } from './PanelEditorPage.stories.mocks';

import PanelEditorPage from './PanelEditorPage';

type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const pageStory = storyMocks(panelEditorMocks);

/**
 * The panel editor: the query builder on one side, the panel it renders on the
 * other, for a panel that exists or a new one of the chosen kind.
 *
 * Route: `/dashboard/:dashboardId/panel/:panelId`.
 */
const meta = {
	title: 'Pages/Dashboards/Panel Editor',
	component: PanelEditorPage,
	decorators: [withAppLayout],
	// The dashboard and panel ids come out of the pathname, so the editor renders
	// under its own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD_PANEL_EDITOR} component={PanelEditorPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PanelEditorArgs>;

export default meta;

type Story = StoryObj<PanelEditorArgs>;

/**
 * Editing a saved time series panel: the live preview over the query builder on
 * the left, the panel's formatting, legend, axes and thresholds on the right.
 */
export const Default: Story = {};

/** The create route, seeding an unsaved panel of the chosen kind. */
export const NewPanel: Story = {
	args: { panel: 'new' },
};

/** A list panel, where the config pane is the column editor. */
export const ListPanel: Story = {
	args: { panel: 'recent-logs' },
};

/** A table panel, with its column units and thresholds. */
export const TablePanel: Story = {
	args: { panel: 'top-endpoints' },
};

/** A locked dashboard: the editor still opens, but it cannot save. */
export const ReadOnly: Story = {
	args: { locked: true },
};
