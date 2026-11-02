/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator } from '@playwright/test';

/** Ranked DOM rows; a row is a button when drilldown is on. */
export interface TopListPanel {
	rows(): Locator;
	/** Each row's accessible name, `<label>: <value>`, top first. */
	rowNames(): Promise<string[]>;
	clickRow(index: number): Promise<void>;
}

export function topListAt(root: () => Locator): TopListPanel {
	const rows = (): Locator => root().getByTestId('top-list-row');
	return {
		rows,
		rowNames: () =>
			rows().evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('aria-label') ?? ''),
			),
		async clickRow(index) {
			await rows().nth(index).click();
		},
	};
}
