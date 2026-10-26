/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

// antd popups portal to `document.body`, so a testid finds the trigger and the
// options live in a detached `.ant-select-dropdown`.

export interface EditorSelects {
	/** Picks an antd Select option by the trigger's testid. */
	select(triggerTestId: string, optionLabel: string): Promise<void>;
}

async function openDropdown(
	page: Page,
	triggerTestId: string,
): Promise<Locator> {
	const trigger = page.getByTestId(triggerTestId);
	await trigger.click();
	// Resolve this Select's own list: a closing dropdown still matches
	// `:not(.ant-select-dropdown-hidden)`, so two in a row trip strict mode.
	const listId = await trigger.locator('input').getAttribute('aria-controls');
	const dropdown = listId
		? page
				.locator(`#${listId}`)
				.locator('xpath=ancestor::div[contains(@class,"ant-select-dropdown")][1]')
		: page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.last();
	await expect(dropdown).toBeVisible();
	return dropdown;
}

export function selectsAt(page: Page): EditorSelects {
	return {
		async select(triggerTestId, optionLabel) {
			const dropdown = await openDropdown(page, triggerTestId);
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ hasText: optionLabel })
				.first()
				.click();
		},
	};
}
