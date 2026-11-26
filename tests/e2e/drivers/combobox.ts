import { expect, type Locator, type Page } from '@playwright/test';

export interface Combobox {
	chips(): Locator;
	/** Searches the open list for `label` and picks the row with that exact name. */
	pick(label: string): Promise<void>;
	/** Removes every chip of a multiple combobox. */
	clear(): Promise<void>;
}

/** A `@signozhq/ui` Combobox, addressed by its trigger; the popup renders in a portal. */
export function comboboxAt(page: Page, trigger: Locator): Combobox {
	const chips = (): Locator => trigger.locator('[data-slot="combobox-chip"]');

	return {
		chips,
		async pick(label) {
			await trigger.click();
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			// The previous pick's popup can still be leaving, so scope to the open one.
			const popup = page.locator('[data-slot="combobox-popup"]').filter({
				has: page.locator(
					'[data-slot="combobox-search-input"][aria-expanded="true"]',
				),
			});
			await popup.locator('[data-slot="combobox-search-input"]').fill(label);
			await popup.getByRole('option', { name: label, exact: true }).click();
			// A multiple combobox stays open after a pick. Escape can also close the
			// dialog around it, so toggle it shut from its chevron instead.
			await expect(async () => {
				if ((await trigger.getAttribute('aria-expanded')) === 'true') {
					const box = await trigger.boundingBox();
					await trigger.click({
						position: {
							x: Math.max(1, (box?.width ?? 24) - 12),
							y: (box?.height ?? 2) / 2,
						},
					});
				}
				await expect(trigger).toHaveAttribute('aria-expanded', 'false', {
					timeout: 2_000,
				});
			}).toPass({ timeout: 10_000 });
		},
		async clear() {
			const removers = trigger.locator('[data-slot="combobox-chip-remove"]');
			while ((await removers.count()) > 0) {
				await removers.first().click();
			}
		},
	};
}
