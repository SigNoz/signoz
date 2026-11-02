import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLegendPositionDTO as LegendPosition,
	DashboardtypesLineStyleDTO as LineStyleDTO,
	DashboardtypesStackModeDTO as StackMode,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { renderAtRoute } from '@/storybook/renderAtRoute';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import DashboardPage from '../../DashboardPage';

import { panelsMocks } from './Panels.stories.mocks';
import { expectPanel } from './panelPlay/expectPanel';
import { filterLegend, searchTable } from './panelPlay/interactions';
import { walkListPages } from './panelPlay/list';

type PanelsArgs = PageStoryArgs<typeof panelsMocks>;

const pageStory = storyMocks(panelsMocks, { layout: 'app' });

/**
 * A dashboard holding one panel, of whichever kind the Panel kind control
 * picks, drawn from `query_range` (Text renders its own Markdown and queries
 * nothing). Each story asserts what the kind draws: the chart's series, bands and
 * threshold line, the pie's slices, the number's colour, the table's and list's
 * rows.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/Panels',
	tags: ['play'],
	// The page is wrapped in `withAuthZPage`, which types its props as an index
	// signature; the story's args are what the controls resolve to.
	component: DashboardPage as ComponentType<PanelsArgs>,
	// The page reads the dashboard id out of the pathname.
	render: renderAtRoute(ROUTES.DASHBOARD, DashboardPage),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PanelsArgs>;

export default meta;

type Story = StoryObj<PanelsArgs>;

const play: Story['play'] = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
};

/** A time series panel: p99 latency, one line per service, with a bottom legend. */
export const Default: Story = { play };

/** One bar series per service over time, side by side. */
export const Bar: Story = {
	args: { kind: 'Bar' },
	play,
};

/** The services' bars stacked on one another at every moment. */
export const BarStacked: Story = {
	args: { kind: 'Bar', stack: StackMode.normal },
	play,
};

/** The services as filled areas, drawn independently. */
export const Area: Story = {
	args: { kind: 'Area' },
	play,
};

/** The services' areas stacked on one another, each band filling to the one below. */
export const AreaStacked: Story = {
	args: { kind: 'Area', stack: StackMode.normal },
	play,
};

/** The stacked areas rescaled so every moment sums to 100%, each band its service's share. */
export const AreaPercent: Story = {
	args: { kind: 'Area', stack: StackMode.percent },
	play,
};

/** How the latency values distribute across buckets, one bar set per service. */
export const Histogram: Story = {
	args: { kind: 'Histogram' },
	play,
};

/** The histogram binned 50 apart, every bin starting on a multiple of 50. */
export const HistogramBucketWidth: Story = {
	args: { kind: 'Histogram', bucketWidth: '50' },
	play,
};

/**
 * Bucket counts over time on a linear bucket axis, with the count colour bar
 * under the grid.
 */
export const Heatmap: Story = {
	args: { kind: 'Heatmap' },
	play,
};

/** The heatmap's bucket rows laid out on a log scale. */
export const HeatmapLog: Story = {
	args: { kind: 'Heatmap', heatmapScale: HeatmapYScale.log },
	play,
};

/** The heatmap's colour bar pinned to a fixed 5–250 count range. */
export const HeatmapCountRange: Story = {
	args: { kind: 'Heatmap', heatmapCounts: 'fixed' },
	play,
};

/** Each service's share of traffic as a donut, with the total in the middle. */
export const Pie: Story = {
	args: { kind: 'Pie' },
	play,
};

/**
 * A single p99 latency value with its unit, filled with the threshold colour
 * because it is above the threshold.
 */
export const Number: Story = {
	args: { kind: 'Number', thresholds: true },
	play,
};

/** The value's query matched nothing, which the Number panel draws as its own no-data state. */
export const NumberNoData: Story = {
	args: { kind: 'Number', result: 'empty' },
	play,
};

/**
 * One row per service with its calls (`A`) and errors (`B`); only the `A` cells
 * above the threshold are filled with its colour, though `B` crosses it too.
 */
export const Table: Story = {
	args: { kind: 'Table', thresholds: true, columnUnits: true },
	play,
};

/**
 * The table's header search, opened and narrowed to one service, then cleared
 * back to every row.
 */
export const TableSearch: Story = {
	args: { kind: 'Table' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await expectPanel(canvasElement, args);
		await searchTable(canvasElement, args);
	},
};

/** The latest log lines, newest first, on a single page. */
export const List: Story = {
	args: { kind: 'List' },
	play,
};

/**
 * Logs spanning three pages, 25 a request: Next walks to the second and then
 * the last, shorter page, where Next turns off.
 */
export const ListPaginated: Story = {
	args: { kind: 'List', listRows: 60 },
	play: async ({ canvasElement, args }): Promise<void> => {
		await expectPanel(canvasElement, args);
		await walkListPages(canvasElement, args);
	},
};

/** A Markdown runbook: heading, list, link and code block. */
export const Text: Story = {
	args: { kind: 'Text' },
	play,
};

/** The time series on a logarithmic y axis. */
export const LogScale: Story = {
	args: { yScale: 'log' },
	play,
};

/** Dashed lines with a marker on every sample. */
export const LineStyle: Story = {
	args: { lineStyle: LineStyleDTO.dashed, showPoints: true },
	play,
};

/**
 * A 13m hole in every series, broken rather than bridged because it is wider
 * than the 10m the panel spans.
 */
export const SpanGaps: Story = {
	args: { gaps: 'hole', spanGaps: 'break-10m' },
	play,
};

/**
 * The legend beside the chart, with its series search narrowed to one
 * service.
 */
export const LegendRight: Story = {
	args: { legend: LegendPosition.right },
	play: async ({ canvasElement, args }): Promise<void> => {
		await expectPanel(canvasElement, args);
		await filterLegend(canvasElement, args);
	},
};

/** The dashed SLO line across the time series, with its label. */
export const Thresholds: Story = {
	args: { thresholds: true },
	play,
};

/** The query ran and matched nothing, which the panel draws as its no-data state. */
export const NoData: Story = {
	args: { result: 'empty' },
	play,
};

/** Data that came back with a warning, flagged in the panel header. */
export const Warning: Story = {
	args: { result: 'warning' },
	play,
};
