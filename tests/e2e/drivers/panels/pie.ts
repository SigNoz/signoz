/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

/** The donut @visx draws. */
export interface PiePanel {
	/**
	 * A slice's bounding-box centre can fall in the donut hole, so this clicks the
	 * centroid, where the first slice's label leader line starts.
	 */
	clickSlice(): Promise<void>;
}

export function pieAt(page: Page, root: () => Locator): PiePanel {
	return {
		async clickSlice() {
			const leader = root().locator('svg g line').first();
			const { x, y } = await leader.evaluate((node) => {
				const line = node as SVGLineElement;
				const point = new DOMPoint(
					line.x1.baseVal.value,
					line.y1.baseVal.value,
				).matrixTransform(line.getScreenCTM() ?? undefined);
				return { x: point.x, y: point.y };
			});
			await page.mouse.click(x, y);
		},
	};
}
