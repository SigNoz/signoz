import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/dashboards';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// Service Accounts page. RISK MODE — READ-ONLY: never create/edit/delete an
// account or generate a token; the create modal is never opened.
// listAccessible probes the real authz/check backend state in beforeAll (when
// use_fine_grained_authz is on the admin may lack serviceaccount:list, rendering
// PermissionDeniedFullPage); the functional TCs skip when it is false.

test.describe.configure({ mode: 'serial' });

let listAccessible = false;

async function gotoServiceAccounts(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.SERVICE_ACCOUNTS);
	await expect(page.locator('.sa-settings__title')).toBeVisible();
}

function buildSkipReason(
	persona: Parameters<typeof personaSkipReason>[0],
	env: Parameters<typeof personaSkipReason>[1],
): string | null {
	return personaSkipReason(persona, env, SETTINGS_ROUTES.SERVICE_ACCOUNTS);
}

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		const res = await page.request.get('/api/v1/features', {
			headers: { Authorization: `Bearer ${token}` },
		});
		const body = await res.json();
		const flags: { name?: string; active?: boolean }[] = body?.data ?? [];
		const fgAuthz = flags.find((f) => f?.name === 'use_fine_grained_authz');

		if (!fgAuthz?.active) {
			// Without fine-grained authz the SA list is always accessible.
			listAccessible = true;
			return;
		}

		// Probe the authz check endpoint for serviceaccount:list (wildcard).
		const authzRes = await page.request.post('/api/v1/authz/check', {
			headers: { Authorization: `Bearer ${token}` },
			data: [
				{
					relation: 'list',
					object: {
						resource: { kind: 'serviceaccount', type: 'serviceaccount' },
						selector: '*',
					},
				},
			],
		});
		const authzBody = await authzRes.json();
		const items: { authorized?: boolean }[] = authzBody?.data ?? [];
		listAccessible = items.some((i) => i?.authorized);
	} finally {
		await ctx.close();
	}
});

test.describe('Settings — Service Accounts page', () => {
	test('TC-01 page chrome and empty-state render', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!buildSkipReason(persona, env),
			buildSkipReason(persona, env) ?? undefined,
		);
		test.skip(
			!listAccessible,
			'PERSONA_SKIP: serviceaccount:list permission not granted for this persona — PermissionDeniedFullPage renders instead',
		);

		await gotoServiceAccounts(page);

		await expect(page.locator('.sa-settings__title')).toContainText(
			'Service Accounts',
		);
		await expect(page.locator('.sa-settings__subtitle')).toContainText(
			'Overview of service accounts added to this workspace.',
		);
		await expect(
			page.locator('.sa-settings__subtitle a[href*="signoz.io/docs"]'),
		).toBeVisible();

		const controls = page.locator('.sa-settings__controls');
		await expect(controls).toBeVisible();
		await expect(
			controls.getByRole('button', { name: /All accounts/i }),
		).toBeVisible();
		await expect(
			controls.locator('input[placeholder="Search by name or email..."]'),
		).toBeVisible();

		await expect(
			controls.getByRole('button', { name: /New Service Account/i }),
		).toBeVisible();

		await expect(page.locator('.sa-table-wrapper')).toBeVisible();
		await expect(page.locator('.sa-empty-state')).toBeVisible();
		await expect(page.locator('.sa-empty-state__text')).toContainText(
			'No service accounts.',
		);
	});

	test('TC-02 filter dropdown writes URL param and shows empty-state per mode', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!buildSkipReason(persona, env),
			buildSkipReason(persona, env) ?? undefined,
		);
		test.skip(
			!listAccessible,
			'PERSONA_SKIP: serviceaccount:list permission not granted for this persona — PermissionDeniedFullPage renders instead',
		);

		await gotoServiceAccounts(page);

		const filterTrigger = page.getByRole('button', { name: /All accounts/i });

		await filterTrigger.click();
		await page.getByText(/^Active ⎯/).click();
		await expect(page).toHaveURL(/[?&]filter=active/);
		await expect(page.locator('.sa-empty-state')).toBeVisible();

		await page.getByRole('button', { name: /Active ⎯/i }).click();
		await page.getByText(/^Deleted ⎯/).click();
		await expect(page).toHaveURL(/[?&]filter=deleted/);
		await expect(page.locator('.sa-empty-state')).toBeVisible();

		await page.getByRole('button', { name: /Deleted ⎯/i }).click();
		await page.getByText(/^All accounts ⎯/).click();
		await expect(page).not.toHaveURL(/[?&]filter=active/);
		await expect(page).not.toHaveURL(/[?&]filter=deleted/);
		await expect(page.locator('.sa-empty-state')).toBeVisible();
	});

	test('TC-03 search updates URL and empty-state; create button enabled', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!buildSkipReason(persona, env),
			buildSkipReason(persona, env) ?? undefined,
		);
		test.skip(
			!listAccessible,
			'PERSONA_SKIP: serviceaccount:list permission not granted for this persona — PermissionDeniedFullPage renders instead',
		);

		await gotoServiceAccounts(page);

		const searchInput = page.locator(
			'input[placeholder="Search by name or email..."]',
		);

		await searchInput.fill('xyznonexistent999');
		await expect(page).toHaveURL(/[?&]search=xyznonexistent999/);
		await expect(page.locator('.sa-empty-state__text')).toContainText(
			'No results for',
		);
		await expect(page.locator('.sa-empty-state__text strong')).toContainText(
			'xyznonexistent999',
		);

		await searchInput.fill('');
		await expect(page).not.toHaveURL(/[?&]search=xyznonexistent999/);
		await expect(page.locator('.sa-empty-state__text')).toContainText(
			'No service accounts.',
		);

		const createBtn = page.getByRole('button', { name: /New Service Account/i });
		await expect(createBtn).toBeVisible();
		await expect(createBtn).toBeEnabled();
	});
});
