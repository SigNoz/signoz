/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { boxOf, dragHorizontally } from './dom';

export interface UPlotScaleState {
	min: number | null;
	max: number | null;
}

/**
 * Real chart state, read from the `__uplot` handle UPlotChart hangs off its
 * container. The DOM only says a chart exists; the scales say what it shows.
 */
export interface Chart {
	/** uPlot binds its cursor to `.u-over`, so this is the pointer target. */
	plotArea(): Locator;
	/** Throws when there is no plot, usually because the panel shows No Data. */
	scales(): Promise<Record<string, UPlotScaleState>>;
	click(): Promise<void>;
	/**
	 * Clicks the first series' middle data point inside the visible window,
	 * placed through uPlot's own scales so it lands on data wherever it sits.
	 */
	clickPoint(): Promise<void>;
	/** Fractions are of the plot area's own box, so panel size does not matter. */
	drag(fromFraction: number, toFraction: number): Promise<void>;
}

export function chartAt(page: Page, host: () => Locator): Chart {
	const plotArea = (): Locator => host().locator('.u-over');
	return {
		plotArea,
		async scales() {
			await expect(host()).toBeVisible();
			return host().evaluate((node) => {
				const plot = (node as { __uplot?: unknown }).__uplot as
					| { scales: Record<string, { min?: number; max?: number }> }
					| undefined;
				if (!plot) {
					throw new Error(
						'no uPlot instance on the chart container — the panel probably rendered "No Data" instead of a plot',
					);
				}
				return Object.fromEntries(
					Object.entries(plot.scales).map(([key, scale]) => [
						key,
						{ min: scale.min ?? null, max: scale.max ?? null },
					]),
				);
			});
		},
		async click() {
			const box = await boxOf(host(), 'the chart');
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		},
		async clickPoint() {
			await expect(host()).toBeVisible();
			const point = await host().evaluate((node) => {
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
				const i = visible[Math.floor(visible.length / 2)]?.i ?? 0;
				const y = plot.data[1]?.[i];
				if (y == null) {
					throw new Error(`no value at index ${i} of the first series`);
				}
				const over = plot.over.getBoundingClientRect();
				return {
					x: over.left + plot.valToPos(xs[i], 'x'),
					y: over.top + plot.valToPos(y, plot.series[1].scale ?? 'y'),
				};
			});
			await page.mouse.move(point.x, point.y);
			await page.mouse.click(point.x, point.y);
		},
		async drag(fromFraction, toFraction) {
			const box = await boxOf(plotArea(), 'the plot area');
			await dragHorizontally(page, box, fromFraction, toFraction);
		},
	};
}
