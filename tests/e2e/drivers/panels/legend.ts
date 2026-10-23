/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator } from '@playwright/test';

export interface Legend {
	item(label: string): Locator;
	items(): Locator;
	/**
	 * Clicks the row: with every series shown it solos this one, with only this
	 * one shown it restores all, otherwise it toggles this one.
	 */
	solo(label: string): Promise<void>;
	/** The marker toggles just that series; disabled on the last one shown. */
	toggle(label: string): Promise<void>;
	/** The row's hover-revealed "Only" / "All" button. */
	scope(label: string): Locator;
	/** Rows are `role="switch"`; `aria-checked` carries the shown state. */
	expectShown(label: string, shown: boolean): Promise<void>;
	/** Rendered for a right legend, and a bottom one once its rows overflow. */
	search(): Locator;
	/** "Showing N of M series", rendered with the search box. */
	status(): Locator;
}

export function legendAt(root: () => Locator): Legend {
	const legendItem = (label: string): Locator =>
		root().locator('[data-legend-item-id]').filter({ hasText: label });
	const byTestId = (testId: string): Locator => root().getByTestId(testId);

	return {
		item: legendItem,
		items: () => root().locator('[data-legend-item-id]'),
		async solo(label) {
			// The label, not the row centre: the scope button overlays its tail.
			await legendItem(label).getByText(label).click();
		},
		async toggle(label) {
			await legendItem(label).locator('[data-is-legend-marker]').click();
		},
		scope: (label) => legendItem(label).locator('[data-testid^="legend-scope-"]'),
		async expectShown(label, shown) {
			await expect(legendItem(label)).toHaveAttribute(
				'aria-checked',
				String(shown),
			);
		},
		search: () => byTestId('legend-search-input'),
		status: () => byTestId('legend-status'),
	};
}
