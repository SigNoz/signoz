import { DashboardtypesHeatmapYScaleDTO as HeatmapYScale } from 'api/generated/services/sigNoz.schemas';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';
import { HEATMAP_PALETTE_MAP } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { expect, waitFor, within } from 'storybook/test';
import type uPlot from 'uplot';

import {
	HEATMAP_BUCKETS,
	HEATMAP_FIXED_COUNTS,
} from '../__story_mockdata__/constants';
import { heatmapMaxCount } from '../__story_mockdata__/panelResponses';

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
