import { expect, type Locator, type Page } from '@playwright/test';

import { ownDropdown, pickChannelByName } from './shared';

// ─── v1 classic form ───────────────────────────────────────────────────────

// Every locator below addresses a testid added to the classic form for this suite.
// Before those, each of these was an antd label or role lookup. If one stops
// resolving, the testid was dropped from the component, not renamed here.

/**
 * The v1 primary action. Its *label* is mode-dependent — *Create Rule* when
 * `isNewRule`, *Save Rule* when editing (`FormAlertRules/index.tsx:970`) — so
 * scenarios that care about the mode assert the text; the locator itself does not.
 */
export function v1SaveButton(page: Page): Locator {
	return page.getByTestId('alert-save-button');
}

export function v1TestButton(page: Page): Locator {
	return page.getByTestId('alert-test-button');
}

/** *Cancel* on create, *Discard* on edit (`FormAlertRules/index.tsx:991-992`). */
export function v1CancelButton(page: Page): Locator {
	return page.getByTestId('alert-cancel-button');
}

export function v1NameInput(page: Page): Locator {
	return page.getByTestId('alert-name-input-v1');
}

export function v1DescriptionInput(page: Page): Locator {
	return page.getByTestId('alert-description-input');
}

export function v1SeveritySelect(page: Page): Locator {
	return page.getByTestId('alert-severity-select');
}

/** The four `RuleOptions` controls, in the order the condition sentence reads. */
export function v1OperatorSelect(page: Page): Locator {
	return page.getByTestId('alert-threshold-op-select');
}

export function v1MatchTypeSelect(page: Page): Locator {
	return page.getByTestId('alert-threshold-match-type-select-v1');
}

export function v1EvalWindowSelect(page: Page): Locator {
	return page.getByTestId('alert-eval-window-select');
}

/**
 * The threshold value. antd's `InputNumber` spreads unknown props straight onto
 * its inner `<input>` (rc-input-number), *not* onto the `.ant-input-number`
 * wrapper — so the testid is already the field and looking for an `input`
 * underneath it finds nothing.
 */
export function v1ThresholdInput(page: Page): Locator {
	return page.getByTestId('alert-threshold-target-input');
}

export function v1BroadcastSwitch(page: Page): Locator {
	return page.getByTestId('alert-broadcast-to-all-channels');
}

export function v1ChannelSelect(page: Page): Locator {
	return page.getByTestId('alert-channel-select');
}

/**
 * Pick a channel in the classic form. Deliberately **not** {@link v1SelectOption}:
 * that helper scrolls to nothing and clicks the option by label, which cannot work
 * on a virtualised list — see {@link pickChannelByName} for the measurement. The
 * other v1 selects (operator, match type, evaluation window, severity) have a
 * handful of options each and no search box, so they keep using `v1SelectOption`.
 */
export async function v1SelectChannel(
	page: Page,
	channelName: string,
): Promise<void> {
	await pickChannelByName(page, v1ChannelSelect(page), channelName);
}

/**
 * v1 gates every save behind a confirm dialog: the Save button only opens it
 * (`FormAlertRules/index.tsx:653-655`), and both the field validation and the
 * request live in `saveRule`, which the dialog's OK invokes (`:1007-1010`).
 * A spec that clicks Save and waits for a POST without this step will time out —
 * and one that expects a *validation error* without it will too.
 */
export function v1ConfirmDialog(page: Page): Locator {
	return page.getByTestId('alert-save-confirm-dialog');
}

export async function v1ConfirmSave(page: Page): Promise<void> {
	await expect(v1ConfirmDialog(page)).toBeVisible();
	await v1ConfirmDialog(page).getByRole('button', { name: 'OK' }).click();
}

/** Dismiss the confirm dialog without saving — the CV1-07 half that must not POST. */
export async function v1CancelSave(page: Page): Promise<void> {
	await expect(v1ConfirmDialog(page)).toBeVisible();
	await v1ConfirmDialog(page).getByRole('button', { name: 'Cancel' }).click();
	await expect(v1ConfirmDialog(page)).toBeHidden();
}

/**
 * Pick an option in one of v1's antd selects. Scoped through {@link ownDropdown}
 * because the condition sentence puts four selects side by side, and matched on
 * the exact label because several share option text (*Above* / *Below* appear in
 * both the operator and the match-type lists in the anomaly variant).
 */
export async function v1SelectOption(
	page: Page,
	select: Locator,
	label: string,
): Promise<void> {
	await select.click();
	const dropdown = await ownDropdown(page, select);
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ has: page.getByText(label, { exact: true }) })
		.first()
		.click();

	// The channel select is `mode="multiple"` (`ChannelSelect/index.tsx:91`), so it
	// stays open after a pick and its list overlays the controls below — which the
	// next interaction would hit instead of its target. Escape closes it; on the
	// single selects it is a no-op.
	await page.keyboard.press('Escape');
	await expect(select).not.toHaveClass(/ant-select-open/);
}

/** Switch the v1 query section to another query mode (`QuerySection.tsx`). */
export async function v1SelectQueryMode(
	page: Page,
	mode: 'query-builder' | 'promql' | 'clickhouse',
): Promise<void> {
	await page.getByTestId(`${mode}-tab`).click();
}
