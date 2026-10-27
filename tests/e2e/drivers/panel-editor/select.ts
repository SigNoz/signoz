/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Page } from '@playwright/test';

import { ownDropdown } from '../../helpers/alert-forms/shared';

export interface EditorSelects {
	/** Picks an antd Select option, by exact label, by the trigger's testid. */
	select(triggerTestId: string, optionLabel: string): Promise<void>;
}

export function selectsAt(page: Page): EditorSelects {
	return {
		async select(triggerTestId, optionLabel) {
			const trigger = page.getByTestId(triggerTestId);
			await trigger.click();
			const dropdown = await ownDropdown(page, trigger);
			await expect(dropdown).toBeVisible();
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ has: page.getByText(optionLabel, { exact: true }) })
				.click();
		},
	};
}
