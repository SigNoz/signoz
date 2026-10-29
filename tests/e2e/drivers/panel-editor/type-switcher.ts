/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from '../../helpers/dashboard-spec';

const TYPE_SWITCHER_DRAWER = 'panel-type-switcher-drawer';

export interface TypeSwitcher {
	/** Opens the kind picker drawer and picks one. */
	switchType(kind: PanelKind): Promise<void>;
	/**
	 * A tile in the open type-switcher drawer. Tiles are aria-disabled, not
	 * disabled, so their reason tooltip still hovers.
	 */
	typeOption(kind: PanelKind): Locator;
	openTypeSwitcher(): Promise<Locator>;
}

export function typeSwitcherAt(page: Page): TypeSwitcher {
	const drawer = (): Locator => page.getByTestId(TYPE_SWITCHER_DRAWER);
	const switcher: TypeSwitcher = {
		typeOption: (kind) => drawer().getByTestId(`panel-type-${kind}`),
		async openTypeSwitcher() {
			await page.getByTestId('panel-editor-v2-type-switcher').click();
			await expect(drawer()).toBeVisible();
			return drawer();
		},
		async switchType(kind) {
			await switcher.openTypeSwitcher();
			await switcher.typeOption(kind).click();
			await expect(drawer()).toHaveCount(0);
		},
	};
	return switcher;
}
