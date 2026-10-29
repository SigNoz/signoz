import {
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesStackModeDTO as StackMode,
} from 'api/generated/services/sigNoz.schemas';
import { expect, waitFor, within } from 'storybook/test';
import type uPlot from 'uplot';

import {
	CHART_THRESHOLD_VALUE,
	THRESHOLD_COLOR,
} from '../__story_mockdata__/constants';
import {
	latencyPoints,
	panelRequests,
	serviceIndex,
} from '../__story_mockdata__/panelResponses';
import type { PanelArgs } from '../__story_mockdata__/types';

import { PANEL_LOAD, type PanelPlayArgs } from './args';
import { lineCoverage, waitForPlot } from './plot';

const isStacked = ({ kind, stack }: PanelArgs): boolean =>
	(kind === 'Area' || kind === 'Bar') && stack !== StackMode.none;

const isPercent = ({ kind, stack }: PanelArgs): boolean =>
	kind === 'Area' && stack === StackMode.percent;

/** Time Series and Area carry `chartAppearance`; Bar draws with its defaults. */
const hasLineAppearance = ({ kind }: PanelArgs): boolean =>
	kind === 'TimeSeries' || kind === 'Area';

const nullCount = (plot: uPlot): number =>
	plot.data
		.slice(1)
		.reduce(
			(count, values) =>
				count + (values as unknown[]).filter((value) => value === null).length,
			0,
		);

/** Line style, points and gap handling, read off the live series. */
const expectLineAppearance = async (
	plot: uPlot,
	args: PanelPlayArgs,
): Promise<void> => {
	const series = plot.series.slice(1);
	const appearance = hasLineAppearance(args);
	const dashed = appearance && args.lineStyle === LineStyle.dashed;
	const breaks = appearance && args.spanGaps === 'break-10m';

	for (const [index, line] of series.entries()) {
		await expect((line.dash ?? []).length > 0).toBe(dashed);
		if (appearance) {
			// A predicate, built so it can also show the isolated points a gap leaves
			// behind; uPlot only ever calls it with the plot and the series index.
			const show = line.points?.show as
				| boolean
				| ((u: uPlot, seriesIndex: number) => boolean)
				| undefined;
			await expect(typeof show === 'function' ? show(plot, index + 1) : show).toBe(
				args.showPoints,
			);
		}
		// A numeric threshold is applied in data-prep, so uPlot's own bridging is off.
		await expect(line.spanGaps).toBe(!breaks);
	}

	// The break is a null inserted into the gap; bridging leaves none.
	await expect(nullCount(plot) > 0).toBe(breaks && args.gaps === 'hole');
};

/**
 * Every series' plotted share against its raw value over the column total. A
 * percent stack plots running totals from the last series up, so a series' own
 * share is its value minus the one below it.
 */
const expectPercentShares = async (
	plot: uPlot,
	args: PanelPlayArgs,
): Promise<void> => {
	const request = panelRequests().at(-1);
	if (!request) {
		throw new Error('the panel sent no query_range');
	}
	const seriesCount = plot.series.length - 1;
	const raw = plot.series.slice(1).map(({ label }) => {
		const index = serviceIndex(String(label));
		return new Map(
			latencyPoints(request.window, index, args.gaps).map((point) => [
				Math.round(point.timestamp / 1000),
				point.value,
			]),
		);
	});
	const plotted = plot.data as (number | null)[][];

	let checked = 0;
	for (const [column, x] of (plot.data[0] as number[]).entries()) {
		const values = raw.map((byTime) => byTime.get(Math.round(x)));
		if (values.some((value) => value === undefined)) {
			continue;
		}
		const total = (values as number[]).reduce((sum, value) => sum + value, 0);
		for (let series = 1; series <= seriesCount; series++) {
			const below = series < seriesCount ? (plotted[series + 1][column] ?? 0) : 0;
			const share = (plotted[series][column] ?? 0) - below;
			await expect(share).toBeCloseTo(
				((values[series - 1] as number) / total) * 100,
				3,
			);
		}
		checked += 1;
	}
	await expect(checked).toBeGreaterThan(0);
};

export const expectLineChart = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const plot = await waitForPlot(root, args.series);

	// Set from options at construction; uPlot's typings leave it off the instance.
	const { bands } = plot as uPlot & { bands?: uPlot.Band[] };
	await expect(bands?.length ?? 0).toBe(isStacked(args) ? args.series - 1 : 0);
	// A percent stack replaces the y scale with its own 0–100 one.
	if (!isPercent(args)) {
		await expect(plot.scales.y.distr).toBe(args.yScale === 'log' ? 3 : 1);
	}
	await expectLineAppearance(plot, args);
	if (args.legend === 'right') {
		await expect(
			await within(root).findByTestId('legend-search-input', {}, PANEL_LOAD),
		).toBeInTheDocument();
	}
	await waitFor(
		() =>
			expect(
				root.querySelectorAll('[data-legend-item-id][aria-checked="true"]'),
			).toHaveLength(args.series),
		PANEL_LOAD,
	);

	if (isPercent(args)) {
		await expectPercentShares(plot, args);
	}

	// The draw hook paints after the plot mounts, so the canvas is polled.
	await waitFor(async () => {
		const coverage = lineCoverage(plot, CHART_THRESHOLD_VALUE, THRESHOLD_COLOR);
		if (args.thresholds && args.stack !== StackMode.percent) {
			await expect(coverage).toBeGreaterThan(0.4);
		} else if (!args.thresholds) {
			await expect(coverage).toBeLessThan(0.1);
		}
	}, PANEL_LOAD);
};
