import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// Keyboard Shortcuts — static read-only page (RISK MODE: nothing mutated).
// No testids here, so locators are CSS classes (.keyboard-shortcuts,
// .shortcut-section-heading) and role/text.

const ROUTE = SETTINGS_ROUTES.SHORTCUTS;

async function gotoShortcuts(page: Page): Promise<void> {
	await page.goto(ROUTE);
	await expect(page.locator('.keyboard-shortcuts')).toBeVisible();
}

test.describe('Settings — Keyboard Shortcuts page', () => {
	test('TC-01 shortcuts page renders all four grouped sections with entries', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, ROUTE),
			personaSkipReason(persona, env, ROUTE) ?? undefined,
		);

		await gotoShortcuts(page);

		await expect(page.getByTestId('settings-page-title')).toBeVisible();
		await expect(page.getByTestId('settings-page-sidenav')).toBeVisible();

		await expect(
			page.getByTestId('settings-page-sidenav').getByTestId('keyboard-shortcuts'),
		).toBeVisible();

		const sections = page.locator('.shortcut-section-heading');
		await expect(sections).toHaveCount(4);
		await expect(sections.nth(0)).toHaveText('Global Shortcuts');
		await expect(sections.nth(1)).toHaveText('Logs Explorer Shortcuts');
		await expect(sections.nth(2)).toHaveText('Query Builder Shortcuts');
		await expect(sections.nth(3)).toHaveText('Dashboard Shortcuts');

		await expect(page.locator('.shortcut-section-table')).toHaveCount(4);

		const firstTable = page.locator('.shortcut-section-table').first();
		await expect(
			firstTable.getByRole('columnheader', { name: 'Keyboard Shortcut' }),
		).toBeVisible();
		await expect(
			firstTable.getByRole('columnheader', { name: 'Description' }),
		).toBeVisible();

		// "shift+d" chosen as it is stable across OS variants (no cmd/ctrl).
		const globalTable = page.locator('.shortcut-section-table').nth(0);
		await expect(
			globalTable.getByRole('cell', { name: 'shift+d' }),
		).toBeVisible();
		await expect(
			globalTable.getByRole('cell', { name: 'Navigate to Dashboards List' }),
		).toBeVisible();

		for (let i = 0; i < 4; i++) {
			const table = page.locator('.shortcut-section-table').nth(i);
			await expect(table.locator('tbody tr').first()).toBeVisible();
		}
	});
});
