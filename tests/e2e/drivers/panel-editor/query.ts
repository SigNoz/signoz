/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export interface QueryPane {
	builder(): Locator;
	tab(label: string): Locator;
	/** Has no testid at its call site. */
	runButton(): Locator;
	/** Clicks Run and waits for the response. */
	run(): Promise<void>;
	/** Ctrl/Cmd+Enter from inside the builder; waits for the response. */
	runShortcut(): Promise<void>;
	/** Picks a metric in the aggregation at `index`; options load as you type. */
	selectMetric(metricName: string, index?: number): Promise<void>;
	metricInput(index?: number): Locator;
}

export function queryPaneAt(page: Page, runLabel: string): QueryPane {
	const builder = (): Locator =>
		page.getByTestId('panel-editor-v2-query-builder');
	const pane: QueryPane = {
		builder: () => builder(),
		// exact: 'Query Builder' is also a prefix of the 'AI Query Builder' tab.
		tab: (label) => builder().getByRole('tab', { name: label, exact: true }),
		runButton: () => page.getByRole('button', { name: runLabel }),
		async run() {
			await Promise.all([
				page.waitForResponse((r) => r.url().includes('/query_range')),
				pane.runButton().click(),
			]);
		},
		async runShortcut() {
			await Promise.all([
				page.waitForResponse((r) => r.url().includes('/query_range')),
				(async () => {
					await builder().click();
					await page.keyboard.press('ControlOrMeta+Enter');
				})(),
			]);
		},
		async selectMetric(metricName, index = 0) {
			// An antd AutoComplete: the testid is on a wrapper.
			const field = page.getByTestId(`metric-name-selector-${index}`);
			await field.click();
			await field.locator('input').fill(metricName);
			const dropdown = page.locator(
				'.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
			);
			await expect(dropdown).toBeVisible();
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ hasText: metricName })
				.first()
				.click();
		},
		metricInput: (index = 0) =>
			page.getByTestId(`metric-name-selector-${index}`).locator('input'),
	};
	return pane;
}
