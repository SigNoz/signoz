import {
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesStackModeDTO as StackMode,
} from 'api/generated/services/sigNoz.schemas';
import { MAX_SIDE_BY_SIDE_GROUPS } from 'lib/visualization/charts/Distribution/topGroups';
import {
	DEFAULT_COLOR_RAMP_OPTIONS,
	getRampBottom,
	resolveColorDomain,
} from 'lib/visualization/colorRamp/colorScale';
import { getPaletteStops } from 'lib/visualization/colorRamp/palettes';
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
	heatmapCellCounts,
	serviceAt,
} from '../__story_mockdata__/panelResponses';

import { hasData, PANEL_LOAD, type PanelPlayArgs } from './args';
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

	const domain = resolveColorDomain(
		args.heatmapCounts === 'fixed'
			? HEATMAP_FIXED_COUNTS
			: { min: null, max: null },
		heatmapCellCounts(args.series),
	);
	// The panel sets no colour scale, so the ramp is log, which starts at its floor.
	const bottom = getRampBottom(domain, DEFAULT_COLOR_RAMP_OPTIONS.scale);
	await waitFor(
		() =>
			expect(colorBarLabels(bar)).toEqual([
				bottom.toLocaleString(),
				domain.max.toLocaleString(),
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

	// A stack draws every group. Side by side fits as many as the panel's width allows,
	// up to the cap, and sums the rest into Other.
	const notice = within(root).queryByTestId('distribution-other-notice');
	if (isStacked) {
		await expect(notice).not.toBeInTheDocument();
		await expect(drawn.series.length - 1).toBe(args.series);
	} else {
		if (args.series > MAX_SIDE_BY_SIDE_GROUPS) {
			await expect(notice).toHaveTextContent(
				`of ${args.series} groups; the rest are summed into Other.`,
			);
		}
		await expect(drawn.series.length - 1).toBeLessThanOrEqual(
			MAX_SIDE_BY_SIDE_GROUPS,
		);
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

/** Rows the tooltip list's 300 px window always holds. */
const TOOLTIP_ROWS_IN_VIEW = 7;

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
): Promise<void> => {
	const drawnGroups = plot.series.length - 1;
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
	// The hovered group sits above the divider. The list below runs largest first, one row
	// a drawn group named by its service alone, or over Other the groups Other sums.
	const active = within(tooltip).getByTestId('distribution-tooltip-active');
	const isOverOther = (active.textContent ?? '').startsWith('Other');
	const rows = within(
		within(tooltip).getByTestId('uplot-tooltip-list'),
	).getAllByTestId('uplot-tooltip-item-content');
	const listed = isOverOther ? args.series - (drawnGroups - 1) : drawnGroups;
	// The list renders only the rows in view, so a longer one is checked in part.
	const isWhollyRendered = listed <= TOOLTIP_ROWS_IN_VIEW;
	if (isWhollyRendered) {
		await expect(rows).toHaveLength(listed);
	}
	// The label span carries the full label as its title; the count follows it.
	const rowLabels = rows.map(
		(row) => row.querySelector('[title]')?.getAttribute('title') ?? '',
	);
	const rowCounts = rows.map((row, index) =>
		Number(
			(row.textContent ?? '').slice(rowLabels[index].length).replace(/,/g, ''),
		),
	);
	await expect(rowCounts).toStrictEqual([...rowCounts].sort((a, b) => b - a));
	for (const row of rows) {
		await expect(row).not.toHaveTextContent('service.name');
	}
	if (isWhollyRendered && drawnGroups === args.series) {
		await expect([...rowLabels].sort()).toStrictEqual(
			Array.from({ length: args.series }, (_, group) => serviceAt(group)).sort(),
		);
	}
};

/**
 * Hovers the (100 ms, 250 ms] bucket, then the overflow one. Only a drawn
 * Distribution has a tooltip to check.
 */
export const expectDistributionTooltip = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	if (
		args.kind !== 'Distribution' ||
		args.dataState !== 'loaded' ||
		args.bucketSource === 'no field' ||
		!hasData(args)
	) {
		return;
	}
	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(plot).toBeDefined();
	}, PANEL_LOAD);
	const drawn = plot as uPlot;

	await expectTooltipFor(drawn, args, DISTRIBUTION_BUCKETS.indexOf(250));
	// A clamped range ends at 1000 ms, before the overflow bucket.
	if (args.distributionXRange !== 'clamped') {
		await expectTooltipFor(drawn, args, DISTRIBUTION_BUCKETS.length);
	}
};
