/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

// Panel action menu items take no testid (@signozhq/ui's dropdown preset drops
// it), so their visible label is the contract, matched by Radix's menuitem role.

export const PanelAction = {
	view: 'View',
	edit: 'Edit panel',
	clone: 'Clone',
	download: 'Download',
	downloadCsv: 'Download as CSV',
	downloadPng: 'Download as PNG',
	downloadSvg: 'Download as SVG',
	createAlert: 'Create Alerts',
	move: 'Move to section',
	moveToRoot: 'Dashboard (root)',
	delete: 'Delete panel',
} as const;

export interface PanelActions {
	trigger(): Locator;
	/** Dismisses any menu still open first: one caught mid-dismiss eats the click. */
	open(): Promise<Locator>;
	close(): Promise<void>;
	item(label: string): Locator;
	run(label: string): Promise<void>;
	/** Hovers a parent item to open its submenu; clicking it closes the menu. */
	hoverItem(label: string): Promise<void>;
	download(format: 'CSV' | 'PNG' | 'SVG'): Promise<void>;
	moveTo(sectionTitle: string): Promise<void>;
}

export function actionsAt(
	page: Page,
	panelId: string,
	root: () => Locator,
): PanelActions {
	const menuItem = (label: string): Locator =>
		page.getByRole('menuitem', { name: label, exact: true });

	const actions: PanelActions = {
		trigger: () => page.getByTestId(`panel-actions-${panelId}`),
		async open() {
			await actions.close();
			await root().scrollIntoViewIfNeeded();
			// The trigger only appears on hover.
			await root().hover();
			await actions.trigger().click();
			const menu = page.getByRole('menu');
			await expect(menu).toBeVisible();
			return menu;
		},
		async close() {
			if ((await page.getByRole('menu').count()) === 0) {
				return;
			}
			// An open submenu takes the first Escape for itself.
			await expect(async () => {
				await page.keyboard.press('Escape');
				await expect(page.getByRole('menu')).toHaveCount(0, { timeout: 1_000 });
			}).toPass();
		},
		item: menuItem,
		async run(label) {
			await actions.open();
			await menuItem(label).click();
		},
		async hoverItem(label) {
			await menuItem(label).hover();
		},
		async download(format) {
			await actions.open();
			await menuItem(PanelAction.download).hover();
			await menuItem(`Download as ${format}`).click();
		},
		async moveTo(sectionTitle) {
			await actions.open();
			await menuItem(PanelAction.move).hover();
			await menuItem(sectionTitle).click();
		},
	};

	return actions;
}
