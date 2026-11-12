import {
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesStackModeDTO as StackMode,
} from 'api/generated/services/sigNoz.schemas';
import { MAX_STACKED_GROUPS } from 'lib/visualization/charts/Distribution/topGroups';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';
import { HEATMAP_PALETTE_MAP } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { expect, waitFor, within } from 'storybook/test';
import type uPlot from 'uplot';

import {
	DISTRIBUTION_BUCKETS,
	HEATMAP_BUCKETS,
	HEATMAP_FIXED_COUNTS,
} from '../__story_mockdata__/constants';
import {
	distributionCounts,
	heatmapMaxCount,
	serviceAt,
} from '../__story_mockdata__/panelResponses';

import { PANEL_LOAD, type PanelPlayArgs } from './args';
import { findPlot, toRgb, waitForPlot } from './plot';

const isMultipleOf = (value: number, width: number): boolean =>
	Math.abs(value / width - Math.round(value / width)) < 1e-6;

export const expectHistogram = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const plot = await waitForPlot(root, args.series);
	const bins = plot.data[0] as number[];

	// Bins of the values, not timestamps: the x scale is in the series' own unit.
	await expect(bins.length).toBeGreaterThan(1);
	await expect(plot.scales.x.max ?? Infinity).toBeLessThan(1e6);

	if (args.bucketWidth !== 'auto') {
		const width = Number(args.bucketWidth);
		// Bins start on multiples of the width; empty ones are skipped, so the
		// closest two starts are exactly one width apart.
		await expect(bins.filter((bin) => !isMultipleOf(bin, width))).toEqual([]);
		const steps = bins.slice(1).map((bin, index) => bin - bins[index]);
		await expect(Math.min(...steps)).toBeCloseTo(width, 6);
	}
};

const firstGradientColor = (background: string): string | undefined =>
	background.match(/rgba?\([^)]+\)/)?.[0];

/** The colour bar's low and high labels, either side of the track. */
const colorBarLabels = (bar: HTMLElement): string[] =>
	[...bar.children]
		.filter((node) => node.tagName === 'SPAN')
		.slice(-2)
		.map((node) => node.textContent ?? '');

export const expectHeatmap = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const bar = await within(root).findByTestId('color-bar', {}, PANEL_LOAD);
	await expect(bar).toHaveTextContent(/count/i);

	const range =
		args.heatmapCounts === 'fixed'
			? HEATMAP_FIXED_COUNTS
			: { min: 0, max: heatmapMaxCount(args.series) };
	await waitFor(
		() =>
			expect(colorBarLabels(bar)).toEqual([
				range.min.toLocaleString(),
				range.max.toLocaleString(),
			]),
		PANEL_LOAD,
	);

	const isDark = document.body.classList.contains('darkMode');
	const [lowStop] = getPaletteStops(HEATMAP_PALETTE_MAP[args.palette], isDark);
	const track = bar.querySelector<HTMLElement>('div');
	await expect(firstGradientColor(track?.style.background ?? '')).toBe(
		`rgb(${toRgb(lowStop).join(', ')})`,
	);

	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(plot).toBeDefined();
	}, PANEL_LOAD);
	const yMax = plot?.scales.y.max ?? 0;
	// Log lays rows out on log10 of the bounds; linear on the bounds.
	if (args.heatmapScale === HeatmapYScale.log) {
		await expect(yMax).toBeLessThan(10);
	} else {
		await expect(yMax).toBeGreaterThanOrEqual(
			HEATMAP_BUCKETS[HEATMAP_BUCKETS.length - 1],
		);
	}
};

export const expectDistribution = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const isStacked = args.stack !== StackMode.none;
	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(plot).toBeDefined();
	}, PANEL_LOAD);
	const drawn = plot as uPlot;

	// Side by side fits as many groups as the panel's width allows, never more than a
	// stack, so only a stack has an exact count to hold it to.
	const notice = within(root).queryByTestId('distribution-other-notice');
	if (args.series > MAX_STACKED_GROUPS) {
		await expect(notice).toHaveTextContent(
			isStacked
				? `Showing top ${MAX_STACKED_GROUPS - 1} of ${args.series} groups`
				: `of ${args.series} groups; the rest are summed into Other.`,
		);
	} else if (isStacked) {
		await expect(notice).not.toBeInTheDocument();
	}
	if (isStacked) {
		await expect(drawn.series.length - 1).toBe(
			Math.min(args.series, MAX_STACKED_GROUPS),
		);
	} else {
		await expect(drawn.series.length - 1).toBeLessThanOrEqual(MAX_STACKED_GROUPS);
	}

	// One slot a bucket. Clamped to 10–1000: (10, 25] is slot 2, (500, 1000] slot 7.
	if (args.distributionXRange === 'clamped') {
		await expect(drawn.scales.x.min).toBe(2);
		await expect(drawn.scales.x.max).toBe(8);
	} else {
		await expect(drawn.scales.x.max ?? 0).toBeLessThanOrEqual(
			DISTRIBUTION_BUCKETS.length + 1,
		);
	}

	if (args.stack === StackMode.percent) {
		await expect(drawn.scales.y.max ?? 0).toBeGreaterThanOrEqual(100);
	} else {
		await expect(drawn.scales.y.distr).toBe(args.yScale === 'log' ? 3 : 1);
	}
};

/** Moves uPlot's cursor over `bucket`, low in its column, as a real pointer would. */
const hoverBucket = (plot: uPlot, bucket: number): void => {
	const rect = plot.over.getBoundingClientRect();
	const init = {
		bubbles: true,
		clientX: rect.left + plot.valToPos(bucket + 0.5, 'x'),
		clientY: rect.top + rect.height - 2,
	};
	plot.over.dispatchEvent(new MouseEvent('mouseenter', init));
	plot.over.dispatchEvent(new MouseEvent('mousemove', init));
};

const bucketCounts = (args: PanelPlayArgs, bucket: number): number[] =>
	Array.from(
		{ length: args.series },
		(_, group) => distributionCounts(group, args.overflow)[bucket],
	);

const expectTooltipFor = async (
	plot: uPlot,
	args: PanelPlayArgs,
	bucket: number,
	cumulativeHeading: string,
): Promise<void> => {
	hoverBucket(plot, bucket);
	const total = bucketCounts(args, bucket).reduce(
		(sum, count) => sum + count,
		0,
	);

	const tooltip = await within(document.body).findByTestId(
		'distribution-tooltip',
		{},
		PANEL_LOAD,
	);
	await waitFor(
		async () =>
			expect(
				within(tooltip).getByTestId('distribution-tooltip-total'),
			).toHaveTextContent(total.toLocaleString()),
		PANEL_LOAD,
	);
	await expect(
		within(tooltip).getByTestId('distribution-tooltip-cumulative-heading'),
	).toHaveTextContent(cumulativeHeading);

	// Every group, in legend order, named by its service alone.
	const rows = within(tooltip).getAllByTestId('distribution-tooltip-row');
	await expect(rows).toHaveLength(args.series);
	for (const [group, row] of rows.entries()) {
		await expect(row).toHaveTextContent(serviceAt(group));
		await expect(row).not.toHaveTextContent('service.name');
	}
	await expect(
		rows.filter((row) => row.dataset.isActive === 'true'),
	).toHaveLength(1);
};

/**
 * Hovers the (100 ms, 250 ms] bucket, then the overflow one, whose running share
 * covers every observation.
 */
export const expectDistributionTooltip = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const plot = await waitForPlot(root, args.series);

	await expectTooltipFor(
		plot,
		args,
		DISTRIBUTION_BUCKETS.indexOf(250),
		'≤ 250 ms',
	);
	await expectTooltipFor(plot, args, DISTRIBUTION_BUCKETS.length, 'All');
};
