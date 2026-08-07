import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// OrganizationSettings (/settings/org-settings): DisplayName form + AuthDomain section.
// Invite coverage lives in members.spec.ts — the #invite-team-members hash is ignored here.
//
// note: PUT /api/v2/orgs returns root_user_operation_unsupported for the bootstrap
// admin user. TC-02 only asserts the field is editable and the Submit button enables;
// it does NOT submit the form. The original org name is never mutated.

test.describe.configure({ mode: 'serial' });

async function gotoOrgSettings(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.ORG_SETTINGS);
	await expect(page.getByLabel('Display name')).toBeVisible();
}

test.describe('Organization Settings — SSO & Org page', () => {
	test('TC-01 page renders display-name field and authenticated-domains section', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS) ?? undefined,
		);

		await gotoOrgSettings(page);

		await expect(page.getByLabel('Display name')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();

		await expect(
			page.getByRole('heading', { name: 'Authenticated Domains' }),
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add Domain' })).toBeVisible();
	});

	// note: root_user_operation_unsupported on save (see header) — never clicks Submit; value restored in finally.
	test('TC-02 org display name — field is editable and Submit enables on change', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS) ?? undefined,
		);

		await gotoOrgSettings(page);

		const nameInput = page.getByLabel('Display name');
		const submitBtn = page.getByRole('button', { name: 'Submit' });

		const originalValue = await nameInput.inputValue();

		try {
			// Submit is disabled when the value equals the current saved name.
			await expect(submitBtn).toBeDisabled();

			await nameInput.fill('org-sso-spec-temp');
			await expect(nameInput).toHaveValue('org-sso-spec-temp');
			await expect(submitBtn).toBeEnabled();

			await nameInput.fill('');
			await expect(submitBtn).toBeDisabled();
		} finally {
			// Restored value equals the saved one, so Submit stays disabled — no API call.
			await nameInput.fill(originalValue);
			await expect(submitBtn).toBeDisabled();
		}
	});

	// RISK MODE: never enable SSO/SAML or click Save — that changes auth for the whole stack.
	test('TC-03 SSO config — Add Domain opens provider-selector modal, close dismisses it', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ORG_SETTINGS) ?? undefined,
		);

		await gotoOrgSettings(page);

		await page.getByRole('button', { name: 'Add Domain' }).click();

		const modal = page.getByRole('dialog');
		await expect(modal).toBeVisible();

		await expect(
			modal.getByText('Configure Authentication Method'),
		).toBeVisible();
		await expect(modal.getByText('Google Apps Authentication')).toBeVisible();

		// SAML/OIDC visibility depends on the SSO flag — only assert Google Auth, always enabled.

		await modal.getByRole('button', { name: /close/i }).click();
		await expect(modal).not.toBeVisible();
	});
});
