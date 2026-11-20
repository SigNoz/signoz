/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** A faceted uPlot: `data` is `[null, [xs, ys, sizes?], …]`, one entry per series. */
export interface ScatterPlotPanel {
	/** Carries the `__uplot` handle; the default `uplot-main-div` testid is replaced. */
	chart(): Locator;
	emptyMessage(): Locator;
	/**
	 * Hovers, then clicks, the first series' first point. The click handler reads
	 * the hovered point, so a click without the hover lands on nothing.
	 */
	clickPoint(): Promise<void>;
}

export function scatterPlotAt(
	page: Page,
	root: () => Locator,
): ScatterPlotPanel {
	const chart = (): Locator => root().getByTestId('scatter-plot-chart');
	return {
		chart,
		emptyMessage: () => root().getByTestId('scatter-plot-empty-message'),
		async clickPoint() {
			await expect(chart()).toBeVisible();
			const point = await chart().evaluate((node) => {
				const plot = (node as { __uplot?: unknown }).__uplot as
					| {
							data: (null | number[][])[];
							over: HTMLElement;
							valToPos: (value: number, scale: string) => number;
					  }
					| undefined;
				const facets = plot?.data[1];
				if (!plot || !facets) {
					throw new Error('no plotted scatter series on the chart container');
				}
				const box = plot.over.getBoundingClientRect();
				return {
					x: box.left + plot.valToPos(facets[0][0], 'x'),
					y: box.top + plot.valToPos(facets[1][0], 'y'),
				};
			});
			await page.mouse.move(point.x, point.y, { steps: 4 });
			await page.mouse.click(point.x, point.y);
		},
	};
}
