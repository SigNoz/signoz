import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '@/storybook/renderAtRoute';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks } from '../PanelEditorPage.stories.mocks';
import {
	moveLegendRight,
	openAreaChartAppearance,
	openAxes,
	openChartAppearance,
	openFormatting,
	openHistogramBuckets,
	openLegend,
	openTextAppearance,
	openTimePreference,
	openTopListAppearance,
	openUnitPicker,
	pickDashedGradientWithPoints,
	pickLogScale,
	stackBars,
} from '../__story_mockdata__/chartOptions.play';
import { enterInvalidDisconnectThreshold } from '../__story_mockdata__/panelEditor.play';

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
	render: renderAtRoute(ROUTES.DASHBOARD_PANEL_EDITOR, PanelEditorPage),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PanelEditorArgs>;

export default meta;

type Story = StoryObj<PanelEditorArgs>;

/** The time range the panel reads, open on its choices. */
export const TimePreferenceOpen: Story = {
	play: openTimePreference,
};

/** Formatting & Units: the unit and decimals the values are shown with. */
export const Formatting: Story = {
	play: openFormatting,
};

/** The unit picker, open on its categories. */
export const UnitPickerOpen: Story = {
	play: openUnitPicker,
};

/** Axes: soft bounds for the y axis and its scale. */
export const Axes: Story = {
	play: openAxes,
};

/** The y axis on a log scale, which the preview redraws with. */
export const AxesLogScale: Story = {
	play: pickLogScale,
};

/** Legend: its position, and a color per series the query returned. */
export const Legend: Story = {
	play: openLegend,
};

/** The legend moved to the right of the preview. */
export const LegendRight: Story = {
	play: moveLegendRight,
};

/** Chart appearance: line style, interpolation, fill and points. */
export const ChartAppearance: Story = {
	play: openChartAppearance,
};

/** Disconnect-values in threshold mode, with an invalid duration showing the inline error. */
export const ChartAppearanceDisconnectThreshold: Story = {
	play: enterInvalidDisconnectThreshold,
};

/** Dashed lines under a gradient fill, with the points drawn. */
export const ChartAppearanceDashedGradient: Story = {
	play: pickDashedGradientWithPoints,
};

/** An area chart's appearance, which adds the fill opacity. */
export const AreaChartAppearance: Story = {
	args: { panel: 'new', newPanelKind: 'area-chart' },
	play: openAreaChartAppearance,
};

/** A bar chart with its series stacked on each other. */
export const BarStacked: Story = {
	args: { panel: 'errors-by-status' },
	play: stackBars,
};

/** A table's formatting: a unit per value column. */
export const TableColumnUnits: Story = {
	args: { panel: 'top-endpoints' },
	play: openFormatting,
};

/** A pie chart's legend, colored per slice. */
export const PieLegend: Story = {
	args: { panel: 'traffic-share' },
	play: openLegend,
};

/** A histogram's buckets: how many, how wide, and whether queries merge. */
export const HistogramBuckets: Story = {
	args: { panel: 'new', newPanelKind: 'histogram' },
	play: openHistogramBuckets,
};

/** A text panel's appearance: alignment and background. */
export const TextAppearance: Story = {
	args: { panel: 'new', newPanelKind: 'text' },
	play: openTextAppearance,
};

/** A top list's appearance: rank, share of total and bar colour. */
export const TopListAppearance: Story = {
	args: { panel: 'new', newPanelKind: 'top-list' },
	play: openTopListAppearance,
};
