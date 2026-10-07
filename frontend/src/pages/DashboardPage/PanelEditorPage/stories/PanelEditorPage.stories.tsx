import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks } from './PanelEditorPage.stories.mocks';

import PanelEditorPage from '../PanelEditorPage';

type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const pageStory = storyMocks(panelEditorMocks, { layout: 'app' });

/**
 * The panel editor: the query builder on one side, the panel it renders on the
 * other, for a panel that exists or a new one of the chosen kind.
 *
 * Route: `/dashboard/:dashboardId/panel/:panelId`.
 */
const meta = {
	title: 'Pages/Dashboards/Panel Editor',
	tags: ['play'],
	// The page is wrapped in `withAuthZPage`, which types its props as an index
	// signature; the story's args are what the controls resolve to.
	component: PanelEditorPage as ComponentType<PanelEditorArgs>,
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

const expandConfigSections: Story['play'] = async ({ canvasElement }) => {
	const canvas = within(canvasElement);

	const headers = await canvas.findAllByTestId(
		/^config-section-/,
		{},
		{ timeout: 10000 },
	);
	for (const header of headers) {
		if (header.getAttribute('aria-expanded') === 'false') {
			await userEvent.click(header);
		}
	}
	(document.activeElement as HTMLElement | null)?.blur();
	for (let el = headers[0].parentElement; el; el = el.parentElement) {
		el.scrollTop = 0;
	}
};

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

/** The editor and query configuration remain visible when its preview has no rows. */
export const NoPreviewData: Story = {
	args: { noData: true },
};

/** The editor remains usable while the independently fetched preview has failed. */
export const PreviewQueryError: Story = {
	args: { dataState: 'error' },
	// The mocked queries deliberately fail; the resulting console errors are the state under test.
	parameters: { allowConsoleErrors: true },
};

/** A locked dashboard: the editor still opens, but it cannot save. */
export const ReadOnly: Story = {
	args: { locked: true },
	// The deliberate 500s on the metrics queries are the state under test.
	parameters: { allowConsoleErrors: true },
};

/**
 * Every tooltip the editor carries, held open: the Quick Add beside the
 * Thresholds and Context links section headers, and the copy button on each of
 * the preview legend's series.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
};

/** The panel type browser, opened from the config pane to switch kinds. */
export const ChangePanelType: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId(
				'panel-editor-v2-type-switcher',
				{},
				{ timeout: 10000 },
			),
		);
		await screen.findByTestId('panel-type-switcher-drawer');
	},
};

/** A new time series panel's config pane, every section expanded. */
export const ConfigTimeSeries: Story = {
	args: { panel: 'new', newPanelKind: 'time-series' },
	play: expandConfigSections,
};

/** A new number panel's config pane, every section expanded. */
export const ConfigNumber: Story = {
	args: { panel: 'new', newPanelKind: 'number' },
	play: expandConfigSections,
};

/** A new table panel's config pane, every section expanded. */
export const ConfigTable: Story = {
	args: { panel: 'new', newPanelKind: 'table' },
	play: expandConfigSections,
};

/** A new bar chart panel's config pane, every section expanded. */
export const ConfigBarChart: Story = {
	args: { panel: 'new', newPanelKind: 'bar-chart' },
	play: expandConfigSections,
};

/** A new area chart panel's config pane, every section expanded. */
export const ConfigAreaChart: Story = {
	args: { panel: 'new', newPanelKind: 'area-chart' },
	play: expandConfigSections,
};

/** A new pie chart panel's config pane, every section expanded. */
export const ConfigPieChart: Story = {
	args: { panel: 'new', newPanelKind: 'pie-chart' },
	play: expandConfigSections,
};

/** A new histogram panel's config pane, every section expanded. */
export const ConfigHistogram: Story = {
	args: { panel: 'new', newPanelKind: 'histogram' },
	play: expandConfigSections,
};

/** A new list panel's config pane, every section expanded. */
export const ConfigList: Story = {
	args: { panel: 'new', newPanelKind: 'list' },
	play: expandConfigSections,
};

/** A new text panel's config pane, every section expanded. */
export const ConfigText: Story = {
	args: { panel: 'new', newPanelKind: 'text' },
	play: expandConfigSections,
};
