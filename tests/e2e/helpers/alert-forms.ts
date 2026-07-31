import { expect, type Locator, type Page } from '@playwright/test';

// Helpers for the alert *create* and *edit* forms — two different form
// implementations behind one feature. Rule *seeding* lives in
// `helpers/alerts.ts`; this module is about driving the UI, so nothing here talks
// to the rules API except through the browser.
//
// The single most important thing to know before using any of this: v1 and v2
// are not two skins over one form, they are two components with different
// selectors, different save gates and different success feedback. Every helper
// below is therefore named for the form it drives (`v1…` / `v2…`) unless it is
// genuinely shared, and the shared set is small.

// ─── Routes ────────────────────────────────────────────────────────────────

export const ALERTS_NEW_PATH = '/alerts/new';

/**
 * The standalone edit route. Distinct from `/alerts/overview`, which renders the
 * *same* editor inside the details shell. The two are not interchangeable for v2
 * rules — see `edit/v2.spec.ts` EV2-12.
 */
export const ALERT_EDIT_PATH = '/alerts/edit';

// ─── Enums mirrored from the frontend ──────────────────────────────────────

/**
 * URL values of `AlertTypes` (`frontend/src/types/api/alerts/alertTypes.ts`).
 * Note `METRICS` maps to the *singular* `METRIC_BASED_ALERT` — the enum key and
 * its value disagree in the source, and the URL carries the value.
 */
export const AlertType = {
	METRICS: 'METRIC_BASED_ALERT',
	LOGS: 'LOGS_BASED_ALERT',
	TRACES: 'TRACES_BASED_ALERT',
	EXCEPTIONS: 'EXCEPTIONS_BASED_ALERT',
	ANOMALY: 'ANOMALY_BASED_ALERT',
} as const;

export type AlertTypeValue = (typeof AlertType)[keyof typeof AlertType];

/** `AlertDetectionTypes` (`frontend/src/container/FormAlertRules/index.tsx:78-81`). */
export const RuleType = {
	THRESHOLD: 'threshold_rule',
	ANOMALY: 'anomaly_rule',
} as const;

/**
 * `AlertThresholdOperator` (`CreateAlertV2/context/types.ts:97-103`) and its
 * dropdown labels (`context/constants.ts:123-128`).
 */
export const ThresholdOperator = {
	ABOVE: { value: 'above', label: 'ABOVE' },
	BELOW: { value: 'below', label: 'BELOW' },
	EQUAL_TO: { value: 'equal', label: 'EQUAL TO' },
	NOT_EQUAL_TO: { value: 'not_equal', label: 'NOT EQUAL TO' },
} as const;

/**
 * `AlertThresholdMatchType` (`CreateAlertV2/context/types.ts:105-111`) and its
 * dropdown labels (`context/constants.ts:136-142`).
 *
 * Watch the plural: the enum *key* is `ALL_THE_TIME` but the wire value is
 * `all_the_times`, and the API rejects the singular outright — the same
 * key/value mismatch as `METRICS_BASED_ALERT` → `METRIC_BASED_ALERT`.
 */
export const ThresholdMatchType = {
	AT_LEAST_ONCE: { value: 'at_least_once', label: 'AT LEAST ONCE' },
	ALL_THE_TIME: { value: 'all_the_times', label: 'ALL THE TIME' },
	ON_AVERAGE: { value: 'on_average', label: 'ON AVERAGE' },
	IN_TOTAL: { value: 'in_total', label: 'IN TOTAL' },
	LAST: { value: 'last', label: 'LAST' },
} as const;

/**
 * `AlertListTabs` (`frontend/src/pages/AlertList/types.ts:7-9`). The values are
 * space-less — the tab *labels* read "Triggered Alerts" but the `tab` URL param
 * is `TriggeredAlerts`, and asserting the label form silently fails.
 */
export const AlertListTab = {
	TRIGGERED_ALERTS: 'TriggeredAlerts',
	ALERT_RULES: 'AlertRules',
	CONFIGURATION: 'Configuration',
} as const;

/**
 * The four cards a stock stack shows, in render order
 * (`CreateAlertRule/SelectAlertType/config.ts:10-31`). Anomaly is `unshift`ed to
 * the **front** of this list when the `ANOMALY_DETECTION` feature flag is active,
 * so both the count and the order change when it is enabled.
 */
export const STOCK_ALERT_TYPE_CARDS: AlertTypeValue[] = [
	AlertType.METRICS,
	AlertType.LOGS,
	AlertType.TRACES,
	AlertType.EXCEPTIONS,
];

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the bare type-selection page. `isTypeSelectionMode` is
 * `!alertType && !ruleType && !compositeQuery`
 * (`container/CreateAlertRule/index.tsx:39-41`), so *any* of those three params
 * skips this page — including a stale `compositeQuery` left in the URL.
 */
export async function gotoAlertTypeSelection(page: Page): Promise<void> {
	await page.goto(ALERTS_NEW_PATH);
	await expect(alertTypeCard(page, AlertType.METRICS)).toBeVisible();
}

export function alertTypeCard(page: Page, type: AlertTypeValue): Locator {
	return page.getByTestId(`alert-type-card-${type}`);
}

export function alertTypeCards(page: Page): Locator {
	return page.locator('[data-testid^="alert-type-card-"]');
}

/**
 * Whether the anomaly card is on the page, i.e. whether `ANOMALY_DETECTION` is
 * active for this stack. It **is** active on the pytest-bootstrapped integration
 * stack, so every card-count assertion has to branch on it rather than hard-code
 * 4.
 */
export async function hasAnomalyAlertTypeCard(page: Page): Promise<boolean> {
	return (await alertTypeCard(page, AlertType.ANOMALY).count()) > 0;
}

/**
 * Assert the type-selection page shows exactly the expected set of cards: the
 * four stock ones, plus anomaly *first* when the flag is on (`getOptionList`
 * `unshift`s it, `SelectAlertType/config.ts:33-40`).
 *
 * Written as an exact set rather than "at least four" so that adding a fifth
 * signal still fails this assertion — the flag branch is the only slack.
 */
export async function expectAlertTypeCardSet(page: Page): Promise<void> {
	const anomaly = await hasAnomalyAlertTypeCard(page);
	const expected = anomaly
		? [AlertType.ANOMALY, ...STOCK_ALERT_TYPE_CARDS]
		: STOCK_ALERT_TYPE_CARDS;

	const cards = alertTypeCards(page);
	await expect(cards).toHaveCount(expected.length);

	// Read the testids positionally so order is asserted too — anomaly being
	// unshifted rather than appended is the behaviour worth pinning.
	const rendered: (string | null)[] = [];
	for (let i = 0; i < expected.length; i += 1) {
		// eslint-disable-next-line no-await-in-loop
		rendered.push(await cards.nth(i).getAttribute('data-testid'));
	}
	expect(rendered).toEqual(expected.map((type) => `alert-type-card-${type}`));
}

export interface CreateAlertUrlOptions {
	alertType?: AlertTypeValue;
	ruleType?: string;
	/** Sets `showClassicCreateAlertsPage=true` ⇒ the v1 classic form. */
	classic?: boolean;
	/** Merged in last, so it can override anything above. */
	params?: Record<string, string>;
}

export function createAlertUrl({
	alertType = AlertType.LOGS,
	ruleType = RuleType.THRESHOLD,
	classic = false,
	params = {},
}: CreateAlertUrlOptions = {}): string {
	const search = new URLSearchParams({ alertType, ruleType });
	if (classic) {
		search.set('showClassicCreateAlertsPage', 'true');
	}
	for (const [key, value] of Object.entries(params)) {
		search.set(key, value);
	}
	return `${ALERTS_NEW_PATH}?${search.toString()}`;
}

/**
 * Open the **v2** builder and wait until it has settled. The wait is two-part on
 * purpose: the header proves the builder mounted, and the `compositeQuery` in the
 * URL proves `useShareBuilderUrl` has finished serialising the default query —
 * without the second half, an assertion on the URL races the builder's own
 * rewrite (the same trap `gotoAlertOverview` documents).
 */
export async function gotoCreateAlertV2(
	page: Page,
	options: Omit<CreateAlertUrlOptions, 'classic'> = {},
): Promise<void> {
	await page.goto(createAlertUrl({ ...options, classic: false }));
	await expect(page.getByTestId('alert-name-input')).toBeVisible();
	await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
}

/** Open the **v1** classic create form and wait for its primary action. */
export async function gotoCreateAlertV1(
	page: Page,
	options: Omit<CreateAlertUrlOptions, 'classic'> = {},
): Promise<void> {
	await page.goto(createAlertUrl({ ...options, classic: true }));
	await expect(v1SaveButton(page)).toBeVisible();
}

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
 * `create/edge.spec.ts` CE-09 asserts the obstruction directly, so when the
 * footer is fixed that scenario fails and this helper can go back to `.click()`.
 */
export async function v2ClickDiscard(page: Page): Promise<void> {
	await v2DiscardButton(page).dispatchEvent('click');
}

/**
 * Whether the side navigation currently overlaps a point — the mechanism behind
 * {@link v2ClickDiscard}. Used by the scenario that pins the bug so the
 * workaround above never becomes invisible.
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

/**
 * Pick a notification channel by exact name in one of the two channel selects —
 * v2's per-threshold one and v1's single `alert-channel-select`. Both are
 * `mode="multiple"` antd selects over the *same* global channel list, so both need
 * exactly this sequence; the shared body is why this is one function rather than
 * two near-copies.
 *
 * The list must be **searched**, not scrolled. Channels are global while the
 * `alertChannel` fixture is worker-scoped, so a shared stack accumulates one
 * channel per worker (plus anything a killed run leaked) and antd virtualises the
 * dropdown: measured on this stack, 31 channels render **10** options into the DOM,
 * and the wanted one is simply not there. Clicking by name without filtering first
 * is therefore not a slow path, it is a missing element — and it was the single
 * biggest source of flake in this suite. It fails as a plain click timeout
 * ("waiting for locator … .ant-select-item-option …"), which reads like a renamed
 * testid rather than a virtualised list.
 */
async function pickChannelByName(
	page: Page,
	select: Locator,
	channelName: string,
): Promise<void> {
	const tagsBefore = await selectedTags(select).count();
	await select.click();
	await expect(select).toHaveClass(/ant-select-open/);

	// `fill` on the combobox input rather than `keyboard.type`: the query is a ~30
	// character channel name and every keystroke re-runs antd's filter, so typing it
	// costs ~2.5 s per pick — CV2-09 makes four of them, which was a quarter of that
	// test's 30 s budget. `fill` sets the value in one input event, which is all
	// rc-select's search needs.
	await select.locator('input[role="combobox"]').fill(channelName);
	const dropdown = await ownDropdown(page, select);
	await dropdown
		.locator('.ant-select-item-option')
		.filter({ hasText: channelName })
		.first()
		.click();

	// A multi-select stays open after a pick and its dropdown overlays the controls
	// below, which the next interaction would otherwise hit instead.
	await page.keyboard.press('Escape');

	// Wait for *this* select to report itself closed before returning. antd removes
	// `.ant-select-dropdown-hidden` only after the close transition, so a caller that
	// immediately opens the next row's select races a still-visible stale list: the
	// option lookup then resolves inside the previous row's dropdown and the click
	// fails with "element is not stable" followed by "element is not visible".
	await expect(select).not.toHaveClass(/ant-select-open/);

	// Fail here rather than three assertions later: a silently-missed pick shows up
	// as "Save is still disabled", which points at the validator instead of at this.
	//
	// Counted, not name-matched: v2's select sets `maxTagTextLength={10}`
	// (`ThresholdItem.tsx:140`) so its tag reads `e2e-alerts…`, and v1's passes
	// `optionLabelProp="label"` to options that carry no `label` prop, so its tag
	// renders empty. Neither can ever contain the full channel name. The name itself
	// is verified where it actually matters — in the request body (CV2-20, CV1-08).
	await expect(selectedTags(select)).toHaveCount(tagsBefore + 1);
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
 * The currently-open antd dropdown. Scoping option lookups to it matters because
 * antd keeps previously-opened dropdowns in the DOM with
 * `.ant-select-dropdown-hidden`, so an unscoped `.ant-select-item-option` can
 * resolve into a stale list.
 *
 * Adequate when only one select is ever open on the page. When several selects of
 * the *same kind* exist — the per-threshold channel selects — use
 * {@link ownDropdown} instead: `-hidden` is applied only after the close
 * transition, so "the open dropdown" is briefly ambiguous.
 */
export function openDropdown(page: Page): Locator {
	return page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
}

/**
 * The dropdown belonging to one specific antd select, resolved through the
 * combobox's `aria-controls` → the listbox id it owns.
 *
 * This is the only unambiguous way to address one of several sibling selects'
 * option lists. Filtering on "the visible dropdown" is not enough: with four
 * threshold rows, row N's list is still mid-close while row N+1's opens, so the
 * option lookup lands in the wrong list and the click fails with "element is not
 * stable" and then "element is not visible".
 */
export async function ownDropdown(
	page: Page,
	select: Locator,
): Promise<Locator> {
	const listId = await select
		.locator('input[role="combobox"]')
		.getAttribute('aria-controls');
	if (!listId) {
		throw new Error(
			'select has no aria-controls — not an antd combobox, or not yet opened',
		);
	}
	return page
		.locator('.ant-select-dropdown')
		.filter({ has: page.locator(`[id="${listId}"]`) });
}

/**
 * An option in the open dropdown, matched on its **exact** label. Substring
 * matching is wrong here: `hasText: 'EQUAL TO'` also matches `NOT EQUAL TO`.
 */
export function dropdownOption(page: Page, label: string): Locator {
	return openDropdown(page)
		.locator('.ant-select-item-option')
		.filter({ has: page.getByText(label, { exact: true }) });
}

/**
 * Read an antd multi-select's chosen values, for asserting what a threshold row
 * ended up pointing at.
 */
export function selectedTags(scope: Locator): Locator {
	return scope.locator('.ant-select-selection-item-content');
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

/**
 * Rolling-window presets (`EvaluationSettings/constants.ts:9-18`) paired with the
 * button label each one produces. A value *outside* this set collapses to `custom`
 * on load (`utils.tsx:86-96`), which is what makes it a prefill assertion worth
 * having: `10m0s` proves the seed was read, `7m0s` proves the fallback fired.
 */
export const EVALUATION_WINDOW_PRESETS = {
	'5m0s': 'Last 5 minutes',
	'10m0s': 'Last 10 minutes',
	'15m0s': 'Last 15 minutes',
	'30m0s': 'Last 30 minutes',
	'1h0m0s': 'Last 1 hour',
	'2h0m0s': 'Last 2 hours',
	'4h0m0s': 'Last 4 hours',
} as const;

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

// ─── SEED-CH1: a stack with no notification channels ───────────────────────

/**
 * Route-stub `GET /api/v1/channels` to an empty list for this page only.
 *
 * This is the **one** place the alerts suite mocks the network, and it is a
 * deliberate exception to the standing no-stubbing rule. The justification: zero
 * channels is a real product state — every fresh install has it — and it is the
 * only state that reaches the `disabled` broadcast switch and
 * the empty-channel dropdown content. It cannot be produced server-side, because
 * `alertChannel` is worker-scoped and parallel workers share one stack, so
 * deleting the channel would break every other scenario running at that moment.
 *
 * Both forms read the same endpoint through `api/channels/getAll`, so one stub
 * covers v1 and v2.
 */
export async function stubNoChannels(page: Page): Promise<void> {
	await page.route('**/api/v1/channels', async (route) => {
		if (route.request().method() !== 'GET') {
			await route.fallback();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ status: 'success', data: [] }),
		});
	});
}
