import { expect, type Locator, type Page } from '@playwright/test';

import { panelChart } from './panels-v2';

// Reading real chart state out of uPlot, via the `__uplot` handle that
// UPlotChart hangs off its container.
//
// The DOM only says a chart exists; the saved spec only proves the editor wrote
// the right JSON. Neither catches a renderer that ignores a setting.

export interface UPlotSeriesState {
	label?: string;
	/** false once a series is hidden via the legend. */
	show: boolean;
	/** Dash pattern; non-empty for a dashed line style. */
	dash?: number[];
	/** uPlot only sets a fill when the panel asks for one. */
	hasFill: boolean;
	/** A predicate function can't cross `evaluate`, so it reports as 'fn'. */
	pointsShow?: boolean | 'fn' | null;
	width?: number;
}

export interface UPlotScaleState {
	min: number | null;
	max: number | null;
	/** uPlot scale distribution: 1 linear, 3 logarithmic. */
	distr?: number;
}

export interface UPlotState {
	/** Excludes the x series at index 0 — callers care about the plotted ones. */
	series: UPlotSeriesState[];
	scales: Record<string, UPlotScaleState>;
	/** Number of points in the x series. */
	pointCount: number;
}

/** Throws if no instance — usually the panel is showing "No Data". */
export async function uplotState(
	page: Page,
	panelId: string,
): Promise<UPlotState> {
	return uplotStateAt(panelChart(page, panelId));
}

/** The editor preview has no `data-panel-root`, so it needs its own locator. */
export function previewChart(page: Page): Locator {
	return page.getByTestId('preview-pane').getByTestId('uplot-main-div');
}

export async function previewState(page: Page): Promise<UPlotState> {
	return uplotStateAt(previewChart(page));
}

/** Read chart state from an explicit `uplot-main-div` locator. */
export async function uplotStateAt(chart: Locator): Promise<UPlotState> {
	await expect(chart).toBeVisible();

	return chart.evaluate((node) => {
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
			  }
			| undefined;

		if (!plot) {
			throw new Error(
				'no uPlot instance on the chart container — the panel probably rendered "No Data" instead of a plot',
			);
		}

		return {
			series: plot.series.slice(1).map((series) => ({
				label: series.label,
				show: series.show !== false,
				dash: series.dash,
				hasFill: series.fill != null,
				pointsShow:
					typeof series.points?.show === 'function'
						? ('fn' as const)
						: (series.points?.show ?? null),
				width: series.width,
			})),
			scales: Object.fromEntries(
				Object.entries(plot.scales).map(([key, scale]) => [
					key,
					{
						min: scale.min ?? null,
						max: scale.max ?? null,
						distr: scale.distr,
					},
				]),
			),
			pointCount: plot.data?.[0]?.length ?? 0,
		};
	});
}

/** Wait until a panel's chart reports the expected number of plotted series. */
export async function expectSeriesCount(
	page: Page,
	panelId: string,
	count: number,
): Promise<void> {
	await expect
		.poll(async () => (await uplotState(page, panelId)).series.length)
		.toBe(count);
}

/** Where axis bounds and log mode land. */
export async function yScale(
	page: Page,
	panelId: string,
): Promise<UPlotScaleState> {
	const state = await uplotState(page, panelId);
	// Panels name the left scale 'y'; fall back to the first non-x scale so this
	// keeps working if a kind introduces its own name.
	return (
		state.scales.y ??
		Object.entries(state.scales).find(([key]) => key !== 'x')?.[1] ?? {
			min: null,
			max: null,
		}
	);
}

/** uPlot encodes a log scale as `distr: 3`. */
export const LOG_DISTR = 3;
