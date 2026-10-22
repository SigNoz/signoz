/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from '../../helpers/dashboard-v2-spec';

import { type SelectOption } from './select';

const TYPE_SWITCHER_DRAWER = 'panel-type-switcher-drawer';

export interface TypeSwitcher {
	typeSwitcher(): Locator;
	/** Opens the kind picker drawer and picks one. */
	switchType(kind: PanelKind): Promise<void>;
	/** A tile in the open type-switcher drawer. */
	typeOption(kind: PanelKind): Locator;
	openTypeSwitcher(): Promise<Locator>;
	/** Every tile in the type switcher, opening it; `disabled` reads aria-disabled. */
	typeOptions(): Promise<SelectOption[]>;
}

/**
 * Tiles are aria-disabled, not disabled, so their reason tooltip still hovers.
 * The label is the display name alone: the tile also renders a preview and a
 * description.
 */
async function tileOptions(scope: Locator): Promise<SelectOption[]> {
	const tiles = scope.locator('[data-testid^="panel-type-signoz/"]');
	await expect(tiles.first()).toBeVisible();
	return tiles.evaluateAll((nodes) =>
		nodes.map((node) => ({
			label:
				node
					.querySelector(
						':scope > span:last-child > span:first-child > span:first-child',
					)
					?.textContent?.trim() ?? '',
			disabled: node.getAttribute('aria-disabled') === 'true',
		})),
	);
}

export function typeSwitcherAt(page: Page): TypeSwitcher {
	const trigger = (): Locator =>
		page.getByTestId('panel-editor-v2-type-switcher');
	const switcher: TypeSwitcher = {
		typeSwitcher: trigger,
		typeOption: (kind) =>
			page.getByTestId(TYPE_SWITCHER_DRAWER).getByTestId(`panel-type-${kind}`),
		async openTypeSwitcher() {
			await trigger().click();
			const drawer = page.getByTestId(TYPE_SWITCHER_DRAWER);
			await expect(drawer).toBeVisible();
			return drawer;
		},
		async switchType(kind) {
			await switcher.openTypeSwitcher();
			await switcher.typeOption(kind).click();
			await expect(page.getByTestId(TYPE_SWITCHER_DRAWER)).toHaveCount(0);
		},
		async typeOptions() {
			const drawer = await switcher.openTypeSwitcher();
			return tileOptions(drawer);
		},
	};
	return switcher;
}
