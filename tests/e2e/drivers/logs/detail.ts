import { expect, type Locator, type Page } from '@playwright/test';

/** The log detail drawer: body, highlights, Overview/Context tabs, field actions. */

export type DetailTab = 'Overview' | 'Context' | 'Metrics';
export type FieldAction =
	| 'Filter for value'
	| 'Filter out value'
	| 'Group by field'
	| 'Replace filters with this value';

export interface LogDetail {
	drawer(): Locator;
	/** Click a row (any format) and wait for the drawer. */
	open(row: Locator): Promise<void>;
	body(): Locator;
	highlights(): Locator;
	tab(name: DetailTab): Promise<void>;
	viewMode(mode: 'Pretty' | 'JSON'): Promise<void>;
	/**
	 * The actions trigger of a pretty-view field. `fieldKey` is the dotted path
	 * from the root, e.g. `attributes.e2e.kind`.
	 */
	fieldActions(fieldKey: string): Locator;
	fieldAction(fieldKey: string, action: FieldAction): Promise<void>;
	contextItems(): Locator;
	close(): Promise<void>;
}

export function logDetailDriver(page: Page): LogDetail {
	const drawer = (): Locator => page.getByTestId('log-detail-drawer');

	const detail: LogDetail = {
		drawer,

		open: async (row) => {
			// Column rows are table rows whose first cell opens the drawer; Default
			// and Raw rows are clickable as a whole.
			const cell = row.locator('td').first();
			if ((await cell.count()) > 0) {
				await cell.click();
			} else {
				await row.click();
			}
			await expect(drawer()).toBeVisible();
		},

		body: () => page.getByTestId('log-detail-body'),
		highlights: () => page.getByTestId('log-details-highlights'),

		tab: async (name) => {
			await page
				.getByTestId('log-detail-views-tabs')
				.getByText(name, { exact: true })
				.click();
		},

		viewMode: async (mode) => {
			await page
				.getByTestId('data-viewer-view-mode')
				.getByText(mode, { exact: true })
				.click();
		},

		fieldActions: (fieldKey) =>
			drawer().getByTestId(`pretty-view-actions-${fieldKey}`),

		fieldAction: async (fieldKey, action) => {
			await detail.fieldActions(fieldKey).click();
			await page.getByRole('menuitem', { name: action }).click();
		},

		contextItems: () => page.locator('[data-testid^="context-log-item-"]'),

		close: async () => {
			await page.keyboard.press('Escape');
			await expect(drawer()).toBeHidden();
		},
	};

	return detail;
}
