import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardMocks } from '../DashboardPage.stories.mocks';
import { openSettings } from './settingsPlay';

import DashboardPage from '../../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * The dashboard's settings drawer on its Overview and Publish tabs: the name,
 * icon, description and tags, the cross-panel sync mode, and the public link.
 * The Publish tab only exists on cloud and enterprise licenses.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/Settings',
	tags: ['authz', 'play'],
	component: DashboardPage as ComponentType<DashboardArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

/** The drawer as Configure opens it, on the Overview tab. */
export const Overview: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement);
		await screen.findByText('Sync Mode');
	},
};

/** Two fields edited, so the footer counts them and offers to save or discard. */
export const OverviewUnsavedChanges: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement);
		await userEvent.type(
			await screen.findByTestId('dashboard-name-field'),
			' (v2)',
		);
		await userEvent.type(
			screen.getByTestId('dashboard-desc'),
			' Owned by the platform team.',
		);
		await screen.findByText('2 unsaved changes');
	},
};

/** The icon picker beside the name, open on the system icons. */
export const OverviewIconPicker: Story = {
	play: async ({ canvasElement }) => {
		const panel = await openSettings(canvasElement);

		await userEvent.click(within(panel).getAllByRole('combobox')[0]);
		await screen.findByRole('listbox');
	},
};

/**
 * Sync set to Tooltip, which adds the choice between every series and only the
 * ones that share the group-by.
 */
export const OverviewTooltipSync: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement);
		await userEvent.click(await screen.findByRole('radio', { name: 'Tooltip' }));
		await screen.findByText('Synced Tooltip Series');
	},
};

/**
 * The Overview tab's own tooltip: Cross-Panel Sync explains what syncing does
 * and links out to the docs.
 */
export const TooltipsInOverview: Story = {
	args: { tooltipsOpen: true },
	play: Overview.play,
};

/** The Publish tab of a dashboard with a public link. */
export const Publish: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Publish');
		await screen.findByText('Default time range');
	},
};

/** The Publish tab with its default time range select open. */
export const PublishTimeRangeOpen: Story = {
	play: async (context) => {
		await Publish.play?.(context);
		await userEvent.click(
			within(screen.getByRole('tabpanel')).getByRole('combobox'),
		);
		await screen.findByRole('listbox');
	},
};

/** The Publish tab of a dashboard nobody published: no link, one Publish button. */
export const PublishPrivate: Story = {
	args: { published: false },
	// The 404 an unpublished dashboard answers with is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Publish');
		await screen.findByText('This dashboard is private');
	},
};
