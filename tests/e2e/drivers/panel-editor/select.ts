/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Page } from '@playwright/test';

import { ownDropdown } from '../../helpers/alert-forms/shared';

export interface EditorSelects {
	/** Picks the panel's own time window, by its exact label. */
	timePreference(label: string): Promise<void>;
}

async function select(
	page: Page,
	triggerTestId: string,
	optionLabel: string,
): Promise<void> {
	const trigger = page.getByTestId(triggerTestId);
	await trigger.click();
	const dropdown = await ownDropdown(page, trigger);
	await expect(dropdown).toBeVisible();
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ has: page.getByText(optionLabel, { exact: true }) })
		.click();
}

export function selectsAt(page: Page): EditorSelects {
	return {
		timePreference: (label) =>
			select(page, 'panel-editor-v2-time-preference', label),
	};
}
