import { expect, type Locator, type Page } from '@playwright/test';

/**
 * antd select primitives, shared by every feature that drives one.
 *
 * antd keeps previously-opened dropdowns in the DOM under
 * `.ant-select-dropdown-hidden`, and applies that class only *after* the close
 * transition — so "the open dropdown" is ambiguous whenever two selects of the
 * same kind sit next to each other. {@link Antd.ownDropdown} resolves the one a
 * specific select owns, through the combobox's `aria-controls`.
 */

export interface Antd {
	/** An antd multi-select's chosen values. */
	selectedTags(scope: Locator): Locator;
	openDropdown(): Locator;
	ownDropdown(select: Locator): Promise<Locator>;
	/** An option in the open dropdown, matched on its **exact** label —
	 * substring matching would make `EQUAL TO` also match `NOT EQUAL TO`. */
	option(label: string): Locator;
	optionLabels(): Promise<string[]>;
	/** Open `select`, search for `name`, pick it, and close. */
	pickByName(select: Locator, name: string): Promise<void>;
}

export function antdDriver(page: Page): Antd {
	const antd: Antd = {
		selectedTags: (scope) => scope.locator('.ant-select-selection-item-content'),

		openDropdown: () =>
			page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),

		ownDropdown: async (select) => {
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
		},

		option: (label) =>
			antd
				.openDropdown()
				.locator('.ant-select-item-option')
				.filter({ has: page.getByText(label, { exact: true }) }),

		optionLabels: async () =>
			antd.openDropdown().locator('.ant-select-item-option').allInnerTexts(),

		/**
		 * The list must be **searched**, not scrolled. Channel-style lists are
		 * global while their fixtures are worker-scoped, so a shared stack
		 * accumulates one entry per worker and antd virtualises the dropdown:
		 * measured at 31 channels, only 10 options exist in the DOM and the wanted
		 * one is simply not there. Clicking by name without filtering first is not
		 * a slow path, it is a missing element, and it was the single biggest
		 * source of flake in this suite.
		 */
		pickByName: async (select, name) => {
			const before = await antd.selectedTags(select).count();
			await select.click();
			await expect(select).toHaveClass(/ant-select-open/);

			// `fill` rather than `keyboard.type`: every keystroke re-runs antd's
			// filter, so typing a ~30 character name costs seconds per pick, while
			// one input event is all rc-select's search needs.
			await select.locator('input[role="combobox"]').fill(name);
			const dropdown = await antd.ownDropdown(select);
			await dropdown
				.locator('.ant-select-item-option')
				.filter({ hasText: name })
				.first()
				.click();

			// A multi-select stays open after a pick and overlays the controls below.
			await page.keyboard.press('Escape');
			// Wait for *this* select to report itself closed: a caller that opens the
			// next one immediately would otherwise race a still-visible stale list.
			await expect(select).not.toHaveClass(/ant-select-open/);

			// Fail here rather than three assertions later: a silently-missed pick
			// surfaces as "Save is still disabled", which points at the validator.
			// Counted, not name-matched — the tags are truncated or empty by design,
			// so the name is verified in the request body where it matters.
			await expect(antd.selectedTags(select)).toHaveCount(before + 1);
		},
	};

	return antd;
}
