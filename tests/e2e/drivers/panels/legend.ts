/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator } from '@playwright/test';

export interface Legend {
	item(label: string): Locator;
	/** Rendered for a right legend, and a bottom one once its rows overflow. */
	search(): Locator;
}

export function legendAt(root: () => Locator): Legend {
	return {
		item: (label) =>
			root().locator('[data-legend-item-id]').filter({ hasText: label }),
		search: () => root().getByTestId('legend-search-input'),
	};
}
