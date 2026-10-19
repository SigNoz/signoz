import {
	expect,
	test as playwright,
	type Locator,
	type Page,
} from '@playwright/test';

import { antdDriver } from '../antd';
import { savedViewsDriver, type SavedViews } from '../savedviews';

/** Saved views for the logs explorer, on the shared saved-views driver. */

export interface LogsViews extends SavedViews {
	/** Stamp shared by every view this test creates; `removeByPrefix` takes it. */
	prefix: string;
	/** A fresh view name under {@link LogsViews.prefix}. */
	name(tag: string): string;
	names(): Promise<string[]>;
	searchBox(): Locator;
	/** Search the explorer's picker for `name` and assert nothing matches. */
	expectNotInSelect(name: string): Promise<void>;
}

export function logsViewsDriver(page: Page): LogsViews {
	const shared = savedViewsDriver(page, 'logs');
	const prefix = `e2e-logs-view-w${playwright.info().workerIndex}-${Date.now()}`;

	// At 1280px the quick-filters rail (z-index 2) covers the left half of the
	// floating views select, so the rail is collapsed before the select is used.
	const uncoverSelect = async (): Promise<void> => {
		const collapse = page.getByRole('button', { name: 'Collapse Filters' });
		if (await collapse.isVisible()) {
			await collapse.click();
			await expect(collapse).toBeHidden();
		}
	};

	return {
		...shared,
		pick: async (name) => {
			await uncoverSelect();
			await shared.pick(name);
		},
		prefix,
		name: (tag) => `${prefix}-${tag}`,
		names: async () => (await shared.list()).map((view) => view.name),
		searchBox: () => page.getByTestId('saved-views-search'),

		expectNotInSelect: async (name) => {
			await uncoverSelect();
			const select = shared.select();
			await select.click();
			await select.locator('input[role="combobox"]').fill(name);
			const dropdown = await antdDriver(page).ownDropdown(select);
			await expect(
				dropdown.locator('.ant-select-item-option').filter({ hasText: name }),
			).toHaveCount(0);
			await page.keyboard.press('Escape');
		},
	};
}
