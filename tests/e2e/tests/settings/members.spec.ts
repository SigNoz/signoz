import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// RISK MODE: read-only plus one non-submitting invite-modal check — no member is
// created/edited/deleted/role-changed. The fresh bootstrap stack has exactly one
// member (seeded admin, active), so filter/search coverage is limited to that row.
// No data-testid exists in MembersSettings/Table/InviteModal — role/placeholder/text/CSS fallback.

test.describe.configure({ mode: 'serial' });

const ADMIN_EMAIL = process.env.SIGNOZ_E2E_USERNAME ?? 'admin@integration.test';
const SEARCH_PLACEHOLDER = 'Search by name or email...';

async function gotoMembers(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.MEMBERS);
	// Members list is fetched server-side; allow margin for the API response.
	await expect(page.locator('.members-table-wrapper')).toBeVisible({
		timeout: 15_000,
	});
}

test.describe('Settings — Members page', () => {
	test('TC-01 list renders with columns and the bootstrap admin user row', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS) ?? undefined,
		);

		await gotoMembers(page);

		await expect(
			page.getByRole('heading', { name: 'Members', level: 1 }),
		).toBeVisible();
		await expect(
			page.getByText('Overview of people added to this workspace.'),
		).toBeVisible();

		await expect(page.locator('.members-filter-trigger')).toBeVisible();
		await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible();
		await expect(
			page.getByRole('button', { name: /invite member/i }),
		).toBeVisible();

		const table = page.locator('.members-table');
		await expect(
			table.getByRole('columnheader', { name: 'Name / Email' }),
		).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Status' }),
		).toBeVisible();
		await expect(
			table.getByRole('columnheader', { name: 'Joined On' }),
		).toBeVisible();

		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toBeVisible();

		const adminRow = page
			.locator('tr')
			.filter({ has: page.locator('.member-email', { hasText: ADMIN_EMAIL }) });
		await expect(adminRow.getByText('ACTIVE')).toBeVisible();
	});

	// On the single-member stack, Pending/Deleted both yield the empty state.
	test('TC-02 filter dropdown — cycles All / Pending / Deleted and updates the list', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS) ?? undefined,
		);

		await gotoMembers(page);

		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toBeVisible();

		await page.locator('.members-filter-trigger').click();
		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();
		await menu.getByText(/pending invites/i).click();

		await expect(page.locator('.members-empty-state')).toBeVisible();
		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toHaveCount(0);

		await page.locator('.members-filter-trigger').click();
		await expect(page.getByRole('menu')).toBeVisible();
		await page
			.getByRole('menu')
			.getByText(/^deleted/i)
			.click();

		await expect(page.locator('.members-empty-state')).toBeVisible();
		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toHaveCount(0);

		await page.locator('.members-filter-trigger').click();
		await expect(page.getByRole('menu')).toBeVisible();
		await page
			.getByRole('menu')
			.getByText(/all members/i)
			.click();

		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toBeVisible();
		await expect(page.locator('.members-empty-state')).toHaveCount(0);
	});

	test('TC-03 search filters by email match and shows empty state on no match', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS) ?? undefined,
		);

		await gotoMembers(page);

		const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER);

		await searchInput.fill(ADMIN_EMAIL);
		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toBeVisible();
		await expect(page.locator('.members-empty-state')).toHaveCount(0);

		await searchInput.fill('xyznonexistentuser999@nowhere.invalid');
		await expect(page.locator('.members-empty-state')).toBeVisible();
		await expect(
			page
				.locator('.members-empty-state__text')
				.getByText('xyznonexistentuser999@nowhere.invalid'),
		).toBeVisible();
		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toHaveCount(0);

		await searchInput.fill('');
		await expect(
			page.locator('.member-email', { hasText: ADMIN_EMAIL }),
		).toBeVisible();
		await expect(page.locator('.members-empty-state')).toHaveCount(0);
	});

	// RISK MODE: submit is never clicked; no invite is sent.
	test('TC-04 invite modal — renders correctly, submit disabled on untouched rows, Cancel dismisses', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MEMBERS) ?? undefined,
		);

		await gotoMembers(page);

		await page.getByRole('button', { name: /invite member/i }).click();

		const modal = page.getByRole('dialog');
		await expect(modal).toBeVisible();

		await expect(
			modal.getByRole('heading', { name: 'Invite Team Members' }),
		).toBeVisible();

		// Header cells scoped to class selectors to avoid matching input placeholders.
		await expect(modal.locator('.email-header')).toBeVisible();
		await expect(modal.locator('.role-header')).toBeVisible();

		// Modal starts with 3 empty rows.
		const emailInputs = modal.locator('input[type="email"]');
		await expect(emailInputs.first()).toBeVisible();
		await expect(emailInputs).toHaveCount(3);

		await expect(
			modal.getByRole('button', { name: /add another/i }),
		).toBeVisible();

		// Submit is disabled while all rows are untouched.
		const submitBtn = modal.getByRole('button', { name: 'Invite Team Members' });
		await expect(submitBtn).toBeVisible();
		await expect(submitBtn).toBeDisabled();

		await modal.getByRole('button', { name: /cancel/i }).click();
		await expect(modal).not.toBeVisible();
	});
});
