import { expect, type Locator, type Page } from '@playwright/test';

// ─── Antd select helpers ───────────────────────────────────────────────────

/**
 * Read an antd multi-select's chosen values, for asserting what a threshold row
 * ended up pointing at.
 */
export function selectedTags(scope: Locator): Locator {
	return scope.locator('.ant-select-selection-item-content');
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
export async function pickChannelByName(
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
