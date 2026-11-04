import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	DashboardtypesDistributionXScaleDTO as DistributionXScale,
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
import {
	playLegendRight,
	playListJsonBody,
	playListPaginated,
	playPanel,
	playTableSearch,
} from './panelPlay/plays';

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

/** A time series panel: p99 latency, one line per service, with a bottom legend. */
export const Default: Story = { play: playPanel };

/** One bar series per service over time, side by side. */
export const Bar: Story = {
	args: { kind: 'Bar' },
	play: playPanel,
};

/** The services' bars stacked on one another at every moment. */
export const BarStacked: Story = {
	args: { kind: 'Bar', stack: StackMode.normal },
	play: playPanel,
};

/** The services as filled areas, drawn independently. */
export const Area: Story = {
	args: { kind: 'Area' },
	play: playPanel,
};

/** The services' areas stacked on one another, each band filling to the one below. */
export const AreaStacked: Story = {
	args: { kind: 'Area', stack: StackMode.normal },
	play: playPanel,
};

/** The stacked areas rescaled so every moment sums to 100%, each band its service's share. */
export const AreaPercent: Story = {
	args: { kind: 'Area', stack: StackMode.percent },
	play: playPanel,
};

/** How the latency values distribute across buckets, one bar set per service. */
export const Histogram: Story = {
	args: { kind: 'Histogram' },
	play: playPanel,
};

/** The histogram binned 50 apart, every bin starting on a multiple of 50. */
export const HistogramBucketWidth: Story = {
	args: { kind: 'Histogram', bucketWidth: '50' },
	play: playPanel,
};

/**
 * Bucket counts over time on a linear bucket axis, with the count colour bar
 * under the grid.
 */
export const Heatmap: Story = {
	args: { kind: 'Heatmap' },
	play: playPanel,
};

/** The heatmap's bucket rows laid out on a log scale. */
export const HeatmapLog: Story = {
	args: { kind: 'Heatmap', heatmapScale: HeatmapYScale.log },
	play: playPanel,
};

/** The heatmap's colour bar pinned to a fixed 5–250 count range. */
export const HeatmapCountRange: Story = {
	args: { kind: 'Heatmap', heatmapCounts: 'fixed' },
	play: playPanel,
};

/**
 * Latency bucket counts over the whole range, one stacked bar per bucket on a log
 * bucket axis, with p50, p90 and p99 marked and the overflow bucket hatched.
 */
export const Distribution: Story = {
	args: { kind: 'Distribution', stack: StackMode.normal },
	play,
};

/** Each bucket split between the services, their bars side by side. */
export const DistributionSideBySide: Story = {
	args: { kind: 'Distribution', stack: StackMode.none },
	play,
};

/** Each bucket stacked to 100%, every band its service's share of that bucket. */
export const DistributionPercent: Story = {
	args: { kind: 'Distribution', stack: StackMode.percent },
	play,
};

/** Every bucket equally wide, whatever its range, counts on a log axis. */
export const DistributionOrdinalLog: Story = {
	args: {
		kind: 'Distribution',
		stack: StackMode.normal,
		distributionXScale: DistributionXScale.ordinal,
		yScale: 'log',
	},
	play,
};

/** Fourteen services: the top nine drawn, the other five summed into Other. */
export const DistributionOther: Story = {
	args: { kind: 'Distribution', stack: StackMode.normal, series: 14 },
	play,
};

/**
 * Fourteen services side by side: as many as keep every bar 3 px wide in the
 * narrowest bucket are drawn, and the rest summed into Other.
 */
export const DistributionSideBySideOther: Story = {
	args: { kind: 'Distribution', stack: StackMode.none, series: 14 },
	play,
};

/**
 * A quarter of observations past the last bound: the overflow bar dominates, p99
 * reads `> 5 s`, and the header warns that the bounds may be too low.
 */
export const DistributionOverflow: Story = {
	args: { kind: 'Distribution', stack: StackMode.normal, overflow: 'high' },
	play,
};

/** Each service's share of traffic as a donut, with the total in the middle. */
export const Pie: Story = {
	args: { kind: 'Pie' },
	play: playPanel,
};

/**
 * 24 services of falling traffic: the smallest 10 fold into one grey "Other (10)" slice,
 * which lists them on hover; click pins the list to drill into any of them.
 */
export const PieOther: Story = {
	args: { kind: 'Pie', pieSlices: 'long-tail' },
	play: playPanel,
};

/**
 * A single p99 latency value with its unit, filled with the threshold colour
 * because it is above the threshold.
 */
export const Number: Story = {
	args: { kind: 'Number', thresholds: true },
	play: playPanel,
};

/** The value's query matched nothing, which the Number panel draws as its own no-data state. */
export const NumberNoData: Story = {
	args: { kind: 'Number', result: 'empty' },
	play: playPanel,
};

/**
 * One row per service with its calls (`A`) and errors (`B`); only the `A` cells
 * above the threshold are filled with its colour, though `B` crosses it too.
 */
export const Table: Story = {
	args: { kind: 'Table', thresholds: true, columnUnits: true },
	play: playPanel,
};

/**
 * The table's header search, opened and narrowed to one service, then cleared
 * back to every row.
 */
export const TableSearch: Story = {
	args: { kind: 'Table' },
	play: playTableSearch,
};

/** The latest log lines, newest first, on a single page. */
export const List: Story = {
	args: { kind: 'List' },
	play: playPanel,
};

/**
 * The List panel on a `use_json_body` tenant: a body holding only `message`
 * reads as its text, one with keys beside it as JSON.
 */
export const ListJsonBody: Story = {
	args: { kind: 'List', listJsonBody: true },
	play: playListJsonBody,
};

/**
 * Logs spanning three pages, 25 a request: Next walks to the second and then
 * the last, shorter page, where Next turns off.
 */
export const ListPaginated: Story = {
	args: { kind: 'List', listRows: 60 },
	play: playListPaginated,
};

/** A Markdown runbook: heading, list, link and code block. */
export const Text: Story = {
	args: { kind: 'Text' },
	play: playPanel,
};

/** The time series on a logarithmic y axis. */
export const LogScale: Story = {
	args: { yScale: 'log' },
	play: playPanel,
};

/** Dashed lines with a marker on every sample. */
export const LineStyle: Story = {
	args: { lineStyle: LineStyleDTO.dashed, showPoints: true },
	play: playPanel,
};

/**
 * A 13m hole in every series, broken rather than bridged because it is wider
 * than the 10m the panel spans.
 */
export const SpanGaps: Story = {
	args: { gaps: 'hole', spanGaps: 'break-10m' },
	play: playPanel,
};

/**
 * The legend beside the chart, with its series search narrowed to one
 * service.
 */
export const LegendRight: Story = {
	args: { legend: LegendPosition.right },
	play: playLegendRight,
};

/** The dashed SLO line across the time series, with its label. */
export const Thresholds: Story = {
	args: { thresholds: true },
	play: playPanel,
};

/** The query ran and matched nothing, which the panel draws as its no-data state. */
export const NoData: Story = {
	args: { result: 'empty' },
	play: playPanel,
};

/** Data that came back with a warning, flagged in the panel header. */
export const Warning: Story = {
	args: { result: 'warning' },
	play: playPanel,
};
