/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

/** The cell tooltip, a component of its own rather than the uPlot tooltip. */
export interface HeatmapTooltip {
	root(): Locator;
}

export function heatmapTooltipAt(page: Page): HeatmapTooltip {
	return {
		root: () => page.getByTestId('heatmap-tooltip'),
	};
}
