/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

export interface HeatmapPanel {
	/** The count colour bar under the grid: caption, min label, ramp, max label. */
	colorBar(): Locator;
	/** Marks the hovered cell's count on the bar. */
	colorBarMarker(): Locator;
}

export interface HeatmapTooltip {
	root(): Locator;
	bucket(): Locator;
	count(): Locator;
}

export function heatmapAt(root: () => Locator): HeatmapPanel {
	const byTestId = (testId: string): Locator => root().getByTestId(testId);
	return {
		colorBar: () => byTestId('color-bar'),
		colorBarMarker: () => byTestId('color-bar-marker'),
	};
}

export function heatmapTooltipAt(page: Page): HeatmapTooltip {
	return {
		root: () => page.getByTestId('heatmap-tooltip'),
		bucket: () => page.getByTestId('heatmap-tooltip-bucket'),
		count: () => page.getByTestId('heatmap-tooltip-count'),
	};
}
