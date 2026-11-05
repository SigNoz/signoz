import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks, savePanel } from './PanelEditorPage.stories.mocks';

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
	title: 'Pages/Dashboards/Panel Editor/Overview',
	tags: ['authz', 'play'],
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

/** The ClickHouse query tab, including its info callout. */
export const ClickHouseQuery: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText('ClickHouse Query', undefined, {
				timeout: 15000,
			}),
		);
		await screen.findByText(/ClickHouse query agent skill/i, undefined, {
			timeout: 15000,
		});
	},
};

/** The create route, seeding an unsaved panel of the chosen kind. */
export const NewPanel: Story = {
	args: { panel: 'new' },
};

/** A number panel: one value, formatted, with comparison thresholds. */
export const NumberPanel: Story = {
	args: { panel: 'p99-latency' },
};

/** A bar chart, whose Visualization section offers stacking. */
export const BarChartPanel: Story = {
	args: { panel: 'errors-by-status' },
};

/** A pie chart, with a legend per slice and no axes. */
export const PieChartPanel: Story = {
	args: { panel: 'traffic-share' },
};

/** A new area chart: the time series options with the area filled. */
export const AreaChartPanel: Story = {
	args: { panel: 'new', newPanelKind: 'area-chart' },
};

/** A new histogram, where the display options are its buckets. */
export const HistogramPanel: Story = {
	args: { panel: 'new', newPanelKind: 'histogram' },
};

/** A new text panel: a markdown body in place of the query builder. */
export const TextPanel: Story = {
	args: { panel: 'new', newPanelKind: 'text' },
};

/** A list panel, where the config pane is the column editor. */
export const ListPanel: Story = {
	args: { panel: 'recent-logs' },
};

/** Interaction: the list panel's add column menu, searching field keys. */
export const ListPanelAddColumnOpen: Story = {
	args: { panel: 'recent-logs' },
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByTestId('list-columns-add', undefined, {
				timeout: 10_000,
			}),
		);
		await screen.findAllByTestId('list-columns-suggestion');
	},
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

/** A new heatmap panel's config pane, every section expanded. */
export const ConfigHeatmap: Story = {
	args: { panel: 'new', newPanelKind: 'heatmap' },
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

/**
 * A saved panel with settings changed: each changed setting and its section
 * carry the unsaved-changes dot.
 */
export const ConfigChanged: Story = {
	play: async (context) => {
		const canvas = within(context.canvasElement);

		await expandConfigSections(context);
		await userEvent.click(
			await canvas.findByTestId('panel-editor-v2-log-scale-log'),
		);
		await userEvent.click(
			await canvas.findByTestId('panel-editor-v2-line-style-dashed'),
		);
	},
};

/**
 * Save changes on a saved panel: the toast raised once the patch answers,
 * before the editor hands back to the dashboard. Set Panel save to `loading`
 * to see the button spin instead.
 */
export const PanelSavedToast: Story = {
	play: async ({ args }): Promise<void> => {
		await savePanel();
		if (args.panelSave === 'success') {
			await screen.findByText('Panel saved');
		}
	},
};

/** Save changes on a new text panel, the editor kind with no query to bake in. */
export const TextPanelSavedToast: Story = {
	args: { panel: 'new', newPanelKind: 'text' },
	play: PanelSavedToast.play,
};
