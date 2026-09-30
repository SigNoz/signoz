import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks } from '../PanelEditorPage.stories.mocks';
import {
	expandSection,
	openConfigSelect,
	pickSegment,
} from './panelEditorPlay';

import PanelEditorPage from '../../PanelEditorPage';

type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const pageStory = storyMocks(panelEditorMocks, { layout: 'app' });

/**
 * The panel editor's display options, one section open at a time: what each
 * panel kind lets a user tune about how its data is drawn, and the preview
 * following along.
 *
 * Route: `/dashboard/:dashboardId/panel/:panelId`.
 */
const meta = {
	title: 'Pages/Dashboards/Panel Editor/Chart Options',
	tags: ['authz', 'play'],
	component: PanelEditorPage as ComponentType<PanelEditorArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD_PANEL_EDITOR} component={PanelEditorPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PanelEditorArgs>;

export default meta;

type Story = StoryObj<PanelEditorArgs>;

/** The time range the panel reads, open on its choices. */
export const TimePreferenceOpen: Story = {
	play: async () => {
		await openConfigSelect('panel-editor-v2-time-preference');
		await screen.findByRole('listbox');
	},
};

/** Formatting & Units: the unit and decimals the values are shown with. */
export const Formatting: Story = {
	play: async () => {
		await expandSection('Formatting & Units');
		await screen.findByTestId('panel-editor-v2-decimals');
	},
};

/** The unit picker, open on its categories. */
export const UnitPickerOpen: Story = {
	play: async (context) => {
		await Formatting.play?.(context);
		await openConfigSelect('panel-editor-v2-unit');
		await screen.findByRole('listbox');
	},
};

/** Axes: soft bounds for the y axis and its scale. */
export const Axes: Story = {
	play: async () => {
		await expandSection('Axes');
		await screen.findByTestId('panel-editor-v2-log-scale');
	},
};

/** The y axis on a log scale, which the preview redraws with. */
export const AxesLogScale: Story = {
	play: async (context) => {
		await Axes.play?.(context);
		await pickSegment('panel-editor-v2-log-scale', 'log');
	},
};

/** Legend: its position, and a color per series the query returned. */
export const Legend: Story = {
	play: async () => {
		await expandSection('Legend');
		await screen.findByTestId('panel-editor-v2-legend-position');
	},
};

/** The legend moved to the right of the preview. */
export const LegendRight: Story = {
	play: async (context) => {
		await Legend.play?.(context);
		await pickSegment('panel-editor-v2-legend-position', 'right');
	},
};

/** Chart appearance: line style, interpolation, fill and points. */
export const ChartAppearance: Story = {
	play: async () => {
		await expandSection('Chart appearance');
		await screen.findByTestId('panel-editor-v2-line-style');
	},
};

/** Dashed lines under a gradient fill, with the points drawn. */
export const ChartAppearanceDashedGradient: Story = {
	play: async (context) => {
		await ChartAppearance.play?.(context);
		await pickSegment('panel-editor-v2-line-style', 'dashed');
		await pickSegment('panel-editor-v2-fill-mode', 'gradient');
		const points = screen.getByTestId('panel-editor-v2-show-points');

		await userEvent.click(points);
		await waitFor(() => expect(points).toHaveAttribute('aria-checked', 'true'));
	},
};

/** An area chart's appearance, which adds the fill opacity. */
export const AreaChartAppearance: Story = {
	args: { panel: 'new', newPanelKind: 'area-chart' },
	play: async () => {
		await expandSection('Chart appearance');
		await screen.findByTestId('panel-editor-v2-fill-opacity');
	},
};

/** A bar chart with its series stacked on each other. */
export const BarStacked: Story = {
	args: { panel: 'errors-by-status' },
	play: async () => {
		await expandSection('Visualization');
		await pickSegment('panel-editor-v2-stacked-bar-chart', 'stacked');
	},
};

/** A table's formatting: a unit per value column. */
export const TableColumnUnits: Story = {
	args: { panel: 'top-endpoints' },
	play: async () => {
		await expandSection('Formatting & Units');
		await screen.findByTestId('panel-editor-v2-decimals');
	},
};

/** A pie chart's legend, colored per slice. */
export const PieLegend: Story = {
	args: { panel: 'traffic-share' },
	play: async () => {
		await expandSection('Legend');
		await screen.findByTestId('panel-editor-v2-legend-position');
	},
};

/** A histogram's buckets: how many, how wide, and whether queries merge. */
export const HistogramBuckets: Story = {
	args: { panel: 'new', newPanelKind: 'histogram' },
	play: async () => {
		await expandSection('Buckets');
		await screen.findByTestId('panel-editor-v2-bucket-count');
	},
};

/** A text panel's appearance: alignment and background. */
export const TextAppearance: Story = {
	args: { panel: 'new', newPanelKind: 'text' },
	play: async () => {
		await expandSection('Panel appearance');
		await screen.findByTestId('text-layout-align');
	},
};
