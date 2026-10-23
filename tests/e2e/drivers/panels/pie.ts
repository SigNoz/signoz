/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator } from '@playwright/test';

/** The donut @visx draws: one `<path>` per visible slice, the total in the hole. */
export interface PiePanel {
	arcs(): Locator;
	/** The total of the visible slices, centred in the donut hole. */
	total(): Locator;
}

export function pieAt(root: () => Locator): PiePanel {
	// The legend's icons are SVGs too; the donut is the first one.
	const chart = (): Locator =>
		root().getByTestId('pie-chart').locator('svg').first();
	return {
		arcs: () => chart().locator('g > path'),
		total: () => chart().locator('text[text-anchor="middle"]'),
	};
}
