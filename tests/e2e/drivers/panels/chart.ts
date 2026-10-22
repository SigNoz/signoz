/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { boxOf, dragHorizontally } from './dom';

/** uPlot encodes a log scale as `distr: 3`. */
export const LOG_DISTR = 3;

export interface UPlotSeriesState {
	label?: string;
	/** false once a series is hidden via the legend. */
	show: boolean;
	/** Non-empty for a dashed line style. */
	dash?: number[];
	/** uPlot only sets a fill when the panel asks for one. */
	hasFill: boolean;
	/** The resolved fill: a colour (`#rrggbbaa` when solid) or 'gradient'. */
	fill: string | null;
	/** Largest finite value plotted, after any stacking; null when none. */
	max: number | null;
	/** A predicate cannot cross `evaluate`, so it reports as 'fn'. */
	pointsShow?: boolean | 'fn' | null;
	width?: number;
}

export interface UPlotScaleState {
	min: number | null;
	max: number | null;
	/** 1 linear, 3 logarithmic. */
	distr?: number;
}

export interface UPlotState {
	/** Excludes the x series at index 0. */
	series: UPlotSeriesState[];
	scales: Record<string, UPlotScaleState>;
	/** Points in the x series. */
	pointCount: number;
	/** Fill bands between series; a stacked chart has one per adjacent pair. */
	bandCount: number;
}

/**
 * Real chart state, read from the `__uplot` handle UPlotChart hangs off its
 * container. The DOM only says a chart exists; this catches a renderer that
 * ignores a setting.
 */
export interface Chart {
	host(): Locator;
	/** uPlot binds its cursor to `.u-over`, so this is the pointer target. */
	plotArea(): Locator;
	/** Throws when there is no plot, usually because the panel shows No Data. */
	state(): Promise<UPlotState>;
	/** The left scale, where axis bounds and log mode land. */
	yScale(): Promise<UPlotScaleState>;
	expectSeriesCount(count: number): Promise<void>;
	/** Moves the pointer to the middle of the plot. */
	hover(): Promise<void>;
	/** Moves the pointer just outside the plot's top-left corner. */
	leave(): Promise<void>;
	click(): Promise<void>;
	/**
	 * Clicks the first series' data point at `index`, by default the middle of
	 * those inside the visible window, placed through uPlot's own scales so it
	 * lands on data wherever it sits.
	 */
	clickPoint(index?: number): Promise<void>;
	/** Fractions are of the plot area's own box, so panel size does not matter. */
	drag(fromFraction: number, toFraction: number): Promise<void>;
}

async function readUplot(host: Locator): Promise<UPlotState> {
	await expect(host).toBeVisible();
	return host.evaluate((node) => {
		const plot = (node as { __uplot?: unknown }).__uplot as
			| {
					series: {
						label?: string;
						show?: boolean;
						dash?: number[];
						fill?: unknown;
						width?: number;
						points?: { show?: boolean | ((...args: unknown[]) => boolean) };
					}[];
					scales: Record<string, { min?: number; max?: number; distr?: number }>;
					data: unknown[][];
					bands?: unknown[];
			  }
			| undefined;

		if (!plot) {
			throw new Error(
				'no uPlot instance on the chart container — the panel probably rendered "No Data" instead of a plot',
			);
		}

		// uPlot wraps every fill in a function; calling it yields the colour or gradient.
		const resolveFill = (fill: unknown, seriesIndex: number): string | null => {
			const value =
				typeof fill === 'function'
					? (fill as (u: unknown, i: number) => unknown)(plot, seriesIndex)
					: fill;
			if (typeof value === 'string') {
				return value;
			}
			return value instanceof CanvasGradient ? 'gradient' : null;
		};

		const maxOf = (values: unknown[] | undefined): number | null => {
			const finite = (values ?? []).filter(
				(value): value is number =>
					typeof value === 'number' && Number.isFinite(value),
			);
			return finite.length > 0 ? Math.max(...finite) : null;
		};

		return {
			series: plot.series.slice(1).map((series, index) => ({
				label: series.label,
				show: series.show !== false,
				dash: series.dash,
				hasFill: series.fill != null,
				fill: resolveFill(series.fill, index + 1),
				max: maxOf(plot.data?.[index + 1]),
				pointsShow:
					typeof series.points?.show === 'function'
						? ('fn' as const)
						: (series.points?.show ?? null),
				width: series.width,
			})),
			scales: Object.fromEntries(
				Object.entries(plot.scales).map(([key, scale]) => [
					key,
					{ min: scale.min ?? null, max: scale.max ?? null, distr: scale.distr },
				]),
			),
			pointCount: plot.data?.[0]?.length ?? 0,
			bandCount: plot.bands?.length ?? 0,
		};
	});
}

export function chartAt(page: Page, host: () => Locator): Chart {
	const plotArea = (): Locator => host().locator('.u-over');
	const chart: Chart = {
		host,
		plotArea,
		state: () => readUplot(host()),
		async yScale() {
			const { scales } = await chart.state();
			// Panels name the left scale 'y'; fall back to the first non-x scale.
			return (
				scales.y ??
				Object.entries(scales).find(([key]) => key !== 'x')?.[1] ?? {
					min: null,
					max: null,
				}
			);
		},
		async expectSeriesCount(count) {
			await expect
				.poll(async () => (await chart.state()).series.length)
				.toBe(count);
		},
		async hover() {
			const box = await boxOf(host(), 'the chart');
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		},
		async leave() {
			const box = await boxOf(host(), 'the chart');
			await page.mouse.move(box.x - 20, box.y - 20);
		},
		async click() {
			const box = await boxOf(host(), 'the chart');
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		},
		async clickPoint(index) {
			await expect(host()).toBeVisible();
			const point = await host().evaluate((node, at) => {
				const plot = (node as { __uplot?: unknown }).__uplot as
					| {
							data: [number[], ...(number | null)[][]];
							scales: { x: { min?: number; max?: number } };
							series: { scale?: string }[];
							over: HTMLElement;
							valToPos: (value: number, scale: string) => number;
					  }
					| undefined;
				if (!plot) {
					throw new Error('no uPlot instance on the chart container');
				}
				const xs = plot.data[0];
				const { min = -Infinity, max = Infinity } = plot.scales.x;
				const visible = xs
					.map((x, i) => ({ x, i }))
					.filter(({ x }) => x >= min && x <= max);
				const i = at ?? visible[Math.floor(visible.length / 2)]?.i ?? 0;
				const y = plot.data[1]?.[i];
				if (y == null) {
					throw new Error(`no value at index ${i} of the first series`);
				}
				const over = plot.over.getBoundingClientRect();
				return {
					x: over.left + plot.valToPos(xs[i], 'x'),
					y: over.top + plot.valToPos(y, plot.series[1].scale ?? 'y'),
				};
			}, index);
			await page.mouse.move(point.x, point.y);
			await page.mouse.click(point.x, point.y);
		},
		async drag(fromFraction, toFraction) {
			const box = await boxOf(plotArea(), 'the plot area');
			await dragHorizontally(page, box, fromFraction, toFraction);
		},
	};
	return chart;
}
