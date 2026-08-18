import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/common';
import {
	deleteRoleViaApi,
	discardChangesDialog,
	findRoleIdsByName,
	ROLE_CREATE_PATH,
	ROLES_SETTINGS_PATH,
	uniqueAlphaSuffix,
	urlOf,
} from '../../helpers/routing';

// Guards hazard 7, the `history.block` protocol. `/settings/roles/new` is the
// only `useNavigationBlocker` consumer in the app, so this file is the entire
// observable surface of the v4 `block(cb) => false` contract that Phase D has to
// rewrite into v6's `tx.retry()`.

// Each test drives the create form, so they must not race each other on the
// role-name uniqueness constraint.
test.describe.configure({ mode: 'serial' });

const BLOCKED_ROLE_NAME = `routing-blocker-${uniqueAlphaSuffix()}`;
const SAVED_ROLE_NAME = `routing-bypass-${uniqueAlphaSuffix()}`;

async function openCreateRoleForm(page: Page, name: string): Promise<void> {
	await page.goto(ROLE_CREATE_PATH);
	const nameInput = page.getByTestId('role-name-input');
	await expect(nameInput).toBeVisible();
	await nameInput.fill(name);
	// `hasUnsavedChanges` is what arms the blocker.
	await expect(page.getByText('Unsaved changes')).toBeVisible();
}

test.describe('Routing — unsaved-changes navigation blocker', () => {
	test.afterAll(async ({ browser }) => {
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		try {
			const token = await authToken(page);
			const ids = await findRoleIdsByName(page, [
				BLOCKED_ROLE_NAME,
				SAVED_ROLE_NAME,
			]);
			await Promise.all(ids.map((id) => deleteRoleViaApi(ctx.request, id, token)));
		} finally {
			await ctx.close();
		}
	});

	test('TC-16 a blocked navigation can be cancelled and then confirmed', async ({
		authedPage: page,
	}) => {
		await openCreateRoleForm(page, BLOCKED_ROLE_NAME);
		const nameInput = page.getByTestId('role-name-input');
		const dialog = discardChangesDialog(page);

		await page.getByTestId('cancel-button').click();
		await expect(dialog).toBeVisible();

		// Cancel: the blocked transition is dropped, not retried.
		await dialog.getByRole('button', { name: 'Keep editing' }).click();
		await expect(dialog).toBeHidden();
		expect(urlOf(page).pathname).toBe(ROLE_CREATE_PATH);
		await expect(nameInput).toHaveValue(BLOCKED_ROLE_NAME);

		// Retry, then confirm: the same transition is replayed by action type.
		await page.getByTestId('cancel-button').click();
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Discard' }).click();

		await page.waitForURL((url) => url.pathname === ROLES_SETTINGS_PATH);
		expect(urlOf(page).pathname).toBe(ROLES_SETTINGS_PATH);
	});

	test('TC-17 saving bypasses the blocker for the next navigation', async ({
		authedPage: page,
	}) => {
		await openCreateRoleForm(page, SAVED_ROLE_NAME);

		// `allowNextNavigation()` unarms the blocker for exactly the push that
		// follows a successful save.
		await page.getByTestId('save-button').click();
		await page.waitForURL((url) => url.pathname === ROLES_SETTINGS_PATH);

		expect(urlOf(page).pathname).toBe(ROLES_SETTINGS_PATH);
		await expect(discardChangesDialog(page)).toHaveCount(0);
		await expect(page.getByTestId('roles-settings')).toBeVisible();
	});
});
