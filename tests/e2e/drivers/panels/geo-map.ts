/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** An OpenLayers canvas; shapes have no DOM of their own to target. */
export interface GeoMapPanel {
	/** Zoom controls render only once the outlines have loaded and drawn. */
	ready(): Locator;
	emptyMessage(): Locator;
	tooltip(): Locator;
	/**
	 * Sweeps the pointer across the map until a shape with data shows its
	 * tooltip, then clicks there. Throws when no shape answers.
	 */
	clickShape(): Promise<void>;
}

export function geoMapAt(page: Page, root: () => Locator): GeoMapPanel {
	const tooltip = (): Locator => page.getByTestId('geo-map-tooltip');
	const ready = (): Locator => root().getByTestId('geo-map-zoom-controls');
	return {
		ready,
		emptyMessage: () => root().getByTestId('geo-map-empty-message'),
		tooltip,
		async clickShape() {
			await expect(ready()).toBeVisible();
			const box = await root().locator('.ol-viewport').boundingBox();
			if (!box) {
				throw new Error('the map viewport has no box');
			}
			for (let y = 0.25; y <= 0.75; y += 0.05) {
				for (let x = 0.1; x <= 0.9; x += 0.04) {
					const point = { x: box.x + box.width * x, y: box.y + box.height * y };
					await page.mouse.move(point.x, point.y);
					if (await tooltip().isVisible()) {
						await page.mouse.click(point.x, point.y);
						return;
					}
				}
			}
			throw new Error('no shape with data under the pointer');
		},
	};
}
