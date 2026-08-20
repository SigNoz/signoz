import { expect, type Locator, type Page } from '@playwright/test';

import { EVALUATION_WINDOW_PRESETS } from './constants';
import { ownDropdown, pickChannelByName, selectedTags } from './shared';

// ─── v2 builder ────────────────────────────────────────────────────────────

/**
 * Footer buttons. The disabled Save/Test buttons are wrapped in a `<span>` inside
 * an antd `Tooltip` (`CreateAlertV2/Footer/Footer.tsx:198-204`) — the wrapper is
 * why {@link v2SaveTooltip} exists instead of reading a `title` attribute, and
 * why these are testids rather than accessible names: the name lookup also
 * matched the wrapper in some states.
 */
export function v2SaveButton(page: Page): Locator {
	return page.getByTestId('save-alert-rule-button');
}

export function v2TestButton(page: Page): Locator {
	return page.getByTestId('test-notification-button');
}

export function v2DiscardButton(page: Page): Locator {
	return page.getByTestId('discard-alert-rule-button');
}

/**
 * Click the v2 Discard button — via `dispatchEvent`, because a real click cannot
 * reach it.
 *
 * The footer is `position: fixed; left: 63px` (the *collapsed* nav rail width) and
 * Discard is its left-most control, so the button occupies roughly x 75-170 at the
 * bottom of the viewport. The side navigation occupies x 0-240 whenever it is
 * 240px wide, which is: always when pinned — the default — and transiently when
 * not pinned, because a mouse travelling toward the button crosses the rail and
 * triggers `:not(.pinned).is-hovered`. Either way `document.elementFromPoint` at
 * the button's centre returns the nav's `.nav-item-data`, so the nav swallows the
 * click.
 *
 * `{ force: true }` does **not** help: it skips Playwright's actionability wait
 * but still delivers a real mouse event at those coordinates, which the nav
 * receives. `dispatchEvent('click')` bypasses hit-testing entirely and React's
 * delegated handler fires normally — verified: the page navigates to `/alerts`.
 *
 * This is a workaround for a **product** bug, not for a flaky test.
 * `create/edge.spec.ts` CE-09 is the skipped scenario that asserts the fixed
 * behaviour; unskipping it and reverting this helper to `.click()` belong in the
 * same commit as the fix.
 */
export async function v2ClickDiscard(page: Page): Promise<void> {
	await v2DiscardButton(page).dispatchEvent('click');
}

/**
 * Whether the side navigation currently overlaps a point — the mechanism behind
 * {@link v2ClickDiscard}. Used by CE-09, which asserts the *absence* of that
 * overlap and is skipped until the footer is fixed.
 */
export async function elementAtPointClassName(
	page: Page,
	x: number,
	y: number,
): Promise<string> {
	return page.evaluate(
		([px, py]) => {
			const el = document.elementFromPoint(px as number, py as number);
			return el ? String(el.className) : '';
		},
		[x, y],
	);
}

/**
 * Hover the (disabled) Save button and return the antd tooltip's text — this is
 * the only way to read `validateCreateAlertState`'s message, since the button
 * cannot be clicked while a message exists.
 */
export async function v2SaveTooltip(page: Page): Promise<string> {
	// The tooltip anchors to the wrapper span, not the disabled button: a disabled
	// button emits no pointer events, so hovering it directly never opens.
	await v2SaveButton(page).locator('xpath=..').hover();
	const tooltip = page.locator('.ant-tooltip-inner').first();
	await expect(tooltip).toBeVisible();
	return (await tooltip.innerText()).trim();
}

/**
 * Threshold rows. There is **no** `threshold-item-<id>` testid — the row is a bare
 * `className="threshold-item"` (`AlertCondition/ThresholdItem.tsx`), so rows are
 * addressed positionally.
 */
export function thresholdRows(page: Page): Locator {
	return page.locator('.threshold-item');
}

export function thresholdRow(page: Page, index: number): Locator {
	return thresholdRows(page).nth(index);
}

/** Assign a notification channel to the Nth v2 threshold. */
export async function selectThresholdChannel(
	page: Page,
	index: number,
	channelName: string,
): Promise<void> {
	await pickChannelByName(
		page,
		page.getByTestId('threshold-notification-channel-select').nth(index),
		channelName,
	);
}

/**
 * Add a label through the v2 header editor. The input is a single field with two
 * phases — key, then value, each committed with Enter
 * (`CreateAlertHeader/LabelsInput.tsx:25-93`) — and a `key:value` string in the
 * first phase is accepted as a shortcut. This helper drives the two-phase path
 * because that is what a user does.
 */
export async function addAlertLabel(
	page: Page,
	key: string,
	value: string,
): Promise<void> {
	await page.getByTestId('alert-add-label-button').click();
	const input = page.getByTestId('alert-add-label-input');
	await input.fill(key);
	await input.press('Enter');
	await input.fill(value);
	await input.press('Enter');

	// Committing a label does *not* close the editor — `isAdding` stays true so a
	// user can type several in a row, which means `alert-add-label-button` is still
	// unmounted. Escape (with both fields empty) is what closes it, and without this
	// a second call to this helper waits forever for the add button.
	await input.press('Escape');
	await expect(page.getByTestId('alert-add-label-button')).toBeVisible();
}

/**
 * The toggle inside an `AdvancedOptionItem` (repeat notifications, send-if-missing,
 * enforce-minimum-datapoints). The `Switch` there carries no testid of its own, so
 * it is reached through the container's — hence the container testid being the
 * documented handle rather than the switch.
 */
export function advancedOptionToggle(
	page: Page,
	containerTestId: string,
): Locator {
	return page.getByTestId(containerTestId).locator('[role="switch"]');
}

// ─── Evaluation window + cadence ───────────────────────────────────────────

export function evaluationSettingsButton(page: Page): Locator {
	return page.getByTestId('evaluation-settings-button');
}

/**
 * Open the evaluation-window popover. It is an antd `Popover`, so its content is
 * only in the DOM while open — every option lookup has to come after this.
 */
export async function openEvaluationSettings(page: Page): Promise<void> {
	await evaluationSettingsButton(page).click();
	await expect(page.locator('.evaluation-window-popover')).toBeVisible();
}

/**
 * A popover option. The popover renders two lists from one component, keyed by
 * `data-section-id` — `window-type` (Rolling / Cumulative) and `timeframe` — and
 * the testid carries both, so `timeframe-option-10m0s` cannot collide with a
 * window-type value.
 */
export function evaluationWindowOption(
	page: Page,
	section: 'window-type' | 'timeframe',
	value: string,
): Locator {
	return page.getByTestId(`${section}-option-${value}`);
}

/**
 * Pick a rolling timeframe and wait for the trigger button to reflect it. The wait
 * matters: the popover closes on its own animation, and a spec that immediately
 * clicks Save can otherwise post the previous window.
 */
export async function selectEvaluationTimeframe(
	page: Page,
	value: keyof typeof EVALUATION_WINDOW_PRESETS,
): Promise<void> {
	await openEvaluationSettings(page);
	await evaluationWindowOption(page, 'timeframe', value).click();
	await expect(evaluationSettingsButton(page)).toContainText(
		EVALUATION_WINDOW_PRESETS[value],
	);
	await page.keyboard.press('Escape');
}

/**
 * Expand the ADVANCED OPTIONS panel inside the alert-condition section.
 *
 * antd's `Collapse` renders its panel children lazily, so `evaluation-cadence-*`
 * and the two `AdvancedOptionItem` containers do not exist in the DOM at all until
 * this runs — an assertion on them without it fails as "not found" rather than as
 * "not visible", which reads like a missing testid.
 */
export async function expandAdvancedOptions(page: Page): Promise<void> {
	const header = page.getByRole('button', { name: /ADVANCED OPTIONS/i });
	if ((await header.getAttribute('aria-expanded')) !== 'true') {
		await header.click();
	}
	await expect(page.getByTestId('evaluation-cadence-input-group')).toBeVisible();
}

/** The cadence duration field — `evaluation.spec.frequency`'s UI half. */
export function evaluationCadenceInput(page: Page): Locator {
	return page.getByTestId('evaluation-cadence-duration-input');
}

export function evaluationCadenceUnitSelect(page: Page): Locator {
	return page.getByTestId('evaluation-cadence-unit-select');
}

export function labelPill(page: Page, key: string, value: string): Locator {
	return page.getByTestId(`label-pill-${key}-${value}`);
}

// Re-export shared helpers that v2 code uses
export { ownDropdown, selectedTags } from './shared';
