import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	createDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';

test.describe.configure({ mode: 'serial' });

const seedIds = new Set<string>();

async function seed(page: Page, title: string): Promise<string> {
	const id = await createDashboardViaApi(page, title);
	seedIds.add(id);
	return id;
}

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) return;
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

async function openEditMode(page: Page): Promise<void> {
	await page.getByTestId('options').click();
}

async function closeEditModeIfOpen(page: Page): Promise<void> {
	const lockBtn = page.getByRole('button', { name: 'Lock Dashboard' });
	if (await lockBtn.isVisible().catch(() => false)) {
		await lockBtn.click({ force: true });
	}
}

test.describe('Dashboard Detail — Edit Mode', () => {
	test('TC-01 edit-mode popup contains all six action buttons', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'edit-mode-popup');
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);

		await expect(
			page.getByRole('button', { name: 'Lock Dashboard' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Rename', exact: true }),
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Full screen' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'New section' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Copy as JSON' }),
		).toBeVisible();

		await page.getByRole('button', { name: 'Lock Dashboard' }).click();
		await expect(
			page.getByRole('button', { name: 'Lock Dashboard' }),
		).toBeHidden();
	});

	test('TC-02 Lock Dashboard exits edit mode', async ({ authedPage: page }) => {
		const id = await seed(page, 'edit-mode-lock');
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Lock Dashboard' }).click();

		await expect(
			page.getByRole('button', { name: 'Lock Dashboard' }),
		).toBeHidden();
		await expect(
			page.getByRole('button', { name: 'Rename', exact: true }),
		).toBeHidden();
		await expect(page.getByRole('button', { name: 'New section' })).toBeHidden();
		await expect(page.getByRole('button', { name: 'Export JSON' })).toBeHidden();
	});

	test('TC-03 rename dashboard — breadcrumb updates, then restore', async ({
		authedPage: page,
	}) => {
		const ts = Date.now();
		const original = `original-${ts}`;
		const renamed = `Renamed-${ts}`;
		const id = await seed(page, original);
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Rename', exact: true }).click();

		const renameDialog = page.getByRole('dialog', {
			name: 'Rename Dashboard',
		});
		await expect(renameDialog).toBeVisible();

		const nameInput = renameDialog.getByTestId('dashboard-name');
		await nameInput.fill('');
		await nameInput.fill(renamed);
		await renameDialog.getByRole('button', { name: 'Rename Dashboard' }).click();

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${renamed}`),
			}),
		).toBeVisible();

		// Restore.
		await openEditMode(page);
		await page.getByRole('button', { name: 'Rename', exact: true }).click();
		const restoreDialog = page.getByRole('dialog', {
			name: 'Rename Dashboard',
		});
		const restoreInput = restoreDialog.getByTestId('dashboard-name');
		await restoreInput.fill('');
		await restoreInput.fill(original);
		await restoreDialog.getByRole('button', { name: 'Rename Dashboard' }).click();

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${original}`),
			}),
		).toBeVisible();
	});

	test('TC-04 cancel rename leaves name unchanged', async ({
		authedPage: page,
	}) => {
		const ts = Date.now();
		const original = `cancel-rename-${ts}`;
		const id = await seed(page, original);
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Rename', exact: true }).click();

		const renameDialog = page.getByRole('dialog', {
			name: 'Rename Dashboard',
		});
		const nameInput = renameDialog.getByTestId('dashboard-name');
		await nameInput.fill('');
		await nameInput.fill('Should Not Be Saved');

		await renameDialog.getByRole('button', { name: 'Cancel' }).click();

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${original}`),
			}),
		).toBeVisible();
		await expect(page.getByText('Should Not Be Saved')).toBeHidden();
	});

	test('TC-05 add a new section via edit mode, then remove it', async ({
		authedPage: page,
	}) => {
		const ts = Date.now();
		const id = await seed(page, `edit-mode-section-${ts}`);
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'New section' }).click();

		const sectionDialog = page.getByRole('dialog', { name: 'New Section' });
		const sectionName = `e2e-section-${ts}`;
		await sectionDialog.getByTestId('section-name').fill(sectionName);
		await sectionDialog.getByRole('button', { name: 'Create Section' }).click();

		const sectionTitle = page
			.locator('.section-title')
			.filter({ hasText: sectionName });
		await expect(sectionTitle).toBeVisible();

		// Cleanup — remove the section. The ellipsis trigger sits on the
		// `.row-panel` container alongside the section title; the popover it
		// opens has rootClassName="row-settings" and renders at body level.
		const sectionRow = sectionTitle.locator(
			'xpath=ancestor::*[contains(@class, "row-panel")]',
		);
		await sectionRow.hover();
		await sectionRow.locator('.settings-icon').click();
		const rowSettingsPopover = page.locator('.row-settings');
		await expect(rowSettingsPopover).toBeVisible();
		await rowSettingsPopover
			.getByRole('button', { name: 'Remove Section' })
			.click();

		const deleteDialog = page.getByRole('dialog', { name: 'Delete Row' });
		await expect(deleteDialog).toBeVisible();
		await deleteDialog.getByRole('button', { name: 'OK' }).click();

		await expect(sectionTitle).toBeHidden();
	});

	test('TC-06 Export JSON triggers a .json download', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'edit-mode-export');
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);

		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Export JSON' }).click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/\.json$/);

		await closeEditModeIfOpen(page);
	});

	test('TC-07 Copy as JSON puts dashboard JSON on the clipboard', async ({
		authedPage: page,
	}) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		const ts = Date.now();
		const title = `edit-mode-copy-${ts}`;
		const id = await seed(page, title);
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Copy as JSON' }).click();

		const clipboardText = await page.evaluate(() =>
			navigator.clipboard.readText(),
		);
		const parsed = JSON.parse(clipboardText) as { title?: string };
		expect(parsed.title ?? '').toContain(title);

		await closeEditModeIfOpen(page);
	});

	// known behaviour: headless Chromium does not honour the Fullscreen API,
	// so we cannot assert `document.fullscreenElement`. Verifying that the
	// click is benign (breadcrumb still rendered) is the strongest cross-env
	// check available.
	test('TC-08 Full screen — clicking does not crash the dashboard', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'edit-mode-fullscreen');
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Full screen' }).click();

		await expect(
			page.getByRole('button', { name: /Dashboard \// }),
		).toBeVisible();

		await page.keyboard.press('Escape');
		await closeEditModeIfOpen(page);
	});

	// ─── Deep coverage ───────────────────────────────────────────────────────

	test('TC-09 lock → unlock round-trip restores edit-mode controls', async ({
		authedPage: page,
	}) => {
		const id = await seed(page, 'edit-mode-lock-roundtrip');
		await page.goto(`/dashboard/${id}`);

		// Lock the dashboard.
		await openEditMode(page);
		await page.getByRole('button', { name: 'Lock Dashboard' }).click();
		await expect(
			page.getByRole('button', { name: 'Lock Dashboard' }),
		).toBeHidden();

		// Re-opening the popup after a lock shows the Unlock label instead of
		// Lock. The button label flips based on `isDashboardLocked`.
		await openEditMode(page);
		const unlockBtn = page.getByRole('button', { name: 'Unlock Dashboard' });
		await expect(unlockBtn).toBeVisible();
		await unlockBtn.click();

		// After unlock, the popup should re-expose the original action buttons.
		await openEditMode(page);
		await expect(
			page.getByRole('button', { name: 'Rename', exact: true }),
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'New section' })).toBeVisible();
		await closeEditModeIfOpen(page);
	});

	test('TC-10 rename persists across hard reload', async ({
		authedPage: page,
	}) => {
		const ts = Date.now();
		const original = `rename-persist-${ts}`;
		const renamed = `Renamed-Persist-${ts}`;
		const id = await seed(page, original);
		await page.goto(`/dashboard/${id}`);

		await openEditMode(page);
		await page.getByRole('button', { name: 'Rename', exact: true }).click();
		const renameDialog = page.getByRole('dialog', {
			name: 'Rename Dashboard',
		});
		const nameInput = renameDialog.getByTestId('dashboard-name');
		await nameInput.fill('');
		await nameInput.fill(renamed);
		await renameDialog.getByRole('button', { name: 'Rename Dashboard' }).click();

		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${renamed}`),
			}),
		).toBeVisible();

		// Hard reload — name must still be the renamed one.
		await page.reload();
		await expect(
			page.getByRole('button', {
				name: new RegExp(`dashboard-icon ${renamed}`),
			}),
		).toBeVisible();
		await expect(page).toHaveTitle(new RegExp(renamed));
	});
});
