import { type Locator, type Page } from '@playwright/test';

/**
 * The v1 primary action. Its *label* is mode-dependent — *Create Rule* when
 * `isNewRule`, *Save Rule* when editing (`FormAlertRules/index.tsx:970`) — so
 * scenarios that care about the mode assert the text; the locator itself does not.
 */
export function v1SaveButton(page: Page): Locator {
	return page.getByTestId('alert-save-button');
}
