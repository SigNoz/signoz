/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { PanelKind } from '../../helpers/dashboard-spec';
import { PATH } from '../dashboards';

const NEW_PANEL_DRAWER = 'panel-type-drawer';

/**
 * The New panel drawer every Add panel trigger opens. A tile click only selects
 * (TimeSeries is preselected); the confirm button navigates to the editor.
 */
export interface NewPanelPicker {
	root(): Locator;
	tile(kind: PanelKind): Locator;
	/** Reads "Add panel", or "Add to <section>" once there is a choice. */
	confirmButton(): Locator;
	/** Selects without confirming. */
	pick(kind: PanelKind): Promise<void>;
	confirm(): Promise<void>;
	/** Selects and confirms, landing on the editor route. */
	choose(kind: PanelKind): Promise<void>;
	/** `value` is the layoutIndex, or 'root' for a root yet to be created. */
	chooseSection(value: string): Promise<void>;
	/** Switches the target to a new section named `title`. */
	newSection(title: string): Promise<void>;
	/** An empty section's own New Panel CTA. Should move to drivers/dashboards.ts. */
	sectionAddPanel(): Locator;
}

export function newPanelDriver(page: Page): NewPanelPicker {
	const root = (): Locator => page.getByTestId(NEW_PANEL_DRAWER);

	const picker: NewPanelPicker = {
		root,
		tile: (kind) => root().getByTestId(`panel-type-${kind}`),
		confirmButton: () => root().getByTestId('panel-type-confirm'),
		async pick(kind) {
			await picker.tile(kind).click();
			await expect(picker.tile(kind)).toHaveAttribute('aria-pressed', 'true');
		},
		async confirm() {
			await picker.confirmButton().click();
			await page.waitForURL(PATH.newPanel);
		},
		async choose(kind) {
			await picker.pick(kind);
			await picker.confirm();
		},
		async chooseSection(value) {
			await root().getByRole('button', { name: 'Choose section' }).click();
			await page.getByTestId(`panel-section-option-${value}`).click();
		},
		async newSection(title) {
			await root().getByRole('button', { name: 'Choose section' }).click();
			await page.getByTestId('panel-section-create').click();
			await root().getByTestId('panel-section-name').fill(title);
		},
		sectionAddPanel: () =>
			page.locator('[data-testid^="section-add-panel-"]').first(),
	};
	return picker;
}
