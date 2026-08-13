import { expect, test } from '../../fixtures/auth';
import {
	createGoogleAuthDomainViaApi,
	deleteAuthDomainByNameViaApi,
	findAuthDomainRow,
	gotoAuthDomains,
	openConfigureAuthDomain,
	ORG_SETTINGS_PATH,
} from '../../helpers/sso';

test.describe('SSO auth domains', () => {
	// Every test seeds its own uniquely-named domain so the file can run fully
	// parallel. Names are registered here and removed by the afterEach guard.
	const cleanupNames: string[] = [];

	test.afterEach(async ({ authedPage: page }) => {
		for (const name of cleanupNames.splice(0)) {
			await deleteAuthDomainByNameViaApi(page, name);
		}
	});

	test('TC-01 org settings shows the authenticated domains section', async ({
		authedPage: page,
	}) => {
		await page.goto(ORG_SETTINGS_PATH);
		await expect(page.getByTestId('auth-domain-title')).toBeVisible();
		await expect(page.getByTestId('auth-domain-add')).toBeVisible();
	});

	test('TC-02 create a google auth domain via the UI', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-create.example.com';
		cleanupNames.push(domain);

		await gotoAuthDomains(page);
		await page.getByTestId('auth-domain-add').click();
		await page.getByTestId('authn-provider-configure-google').click();

		await page.getByTestId('google-auth-domain').fill(domain);
		await page
			.getByTestId('google-auth-client-id')
			.fill('e2e-client-id.apps.googleusercontent.com');
		await page
			.getByTestId('google-auth-client-secret')
			.fill('e2e-client-secret');
		await page.getByTestId('auth-domain-save').click();

		await expect(page.getByText('Domain created successfully')).toBeVisible();
		const row = await findAuthDomainRow(page, domain);
		await expect(row.getByTestId('auth-domain-configure')).toHaveText(
			'Configure Google Auth',
		);
	});

	test('TC-03 editing the client id persists across reopen', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-edit.example.com';
		cleanupNames.push(domain);
		await createGoogleAuthDomainViaApi(page, { name: domain });

		await gotoAuthDomains(page);
		await openConfigureAuthDomain(page, domain);
		await expect(page.getByTestId('google-auth-client-id')).toHaveValue(
			'e2e-client-id.apps.googleusercontent.com',
		);
		await page
			.getByTestId('google-auth-client-id')
			.fill('rotated-client-id.apps.googleusercontent.com');
		await page.getByTestId('auth-domain-save').click();
		await expect(page.getByText('Domain updated successfully')).toBeVisible();
		await expect(page.getByTestId('auth-domain-form')).toBeHidden();

		await openConfigureAuthDomain(page, domain);
		await expect(page.getByTestId('google-auth-client-id')).toHaveValue(
			'rotated-client-id.apps.googleusercontent.com',
		);
	});

	test('TC-04 removing a group mapping persists after save', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-rolemap.example.com';
		cleanupNames.push(domain);
		await createGoogleAuthDomainViaApi(page, {
			name: domain,
			roleMapping: {
				defaultRole: 'signoz-viewer',
				groupMappings: {
					engineers: 'signoz-editor',
					support: 'signoz-viewer',
				},
			},
		});

		await gotoAuthDomains(page);
		await openConfigureAuthDomain(page, domain);
		await page.getByTestId('role-mapping-header').click();

		const rows = page.getByTestId('role-mapping-row');
		await expect(rows).toHaveCount(2);
		// Go marshals map keys sorted, so "engineers" is always the first row.
		await expect(rows.nth(0).getByTestId('role-mapping-group-name')).toHaveValue(
			'engineers',
		);
		await rows.nth(0).getByTestId('role-mapping-remove').click();
		await expect(rows).toHaveCount(1);

		await page.getByTestId('auth-domain-save').click();
		await expect(page.getByText('Domain updated successfully')).toBeVisible();
		await expect(page.getByTestId('auth-domain-form')).toBeHidden();

		await openConfigureAuthDomain(page, domain);
		await page.getByTestId('role-mapping-header').click();
		await expect(rows).toHaveCount(1);
		await expect(rows.getByTestId('role-mapping-group-name')).toHaveValue(
			'support',
		);
	});

	test('TC-05 disabling fetch groups clears the allowed groups', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-groups.example.com';
		cleanupNames.push(domain);
		await createGoogleAuthDomainViaApi(page, {
			name: domain,
			fetchGroups: true,
			serviceAccountJson: '{"type":"service_account","project_id":"e2e"}',
			domainToAdminEmail: { '*': 'admin@sso-groups.example.com' },
			allowedGroups: ['engineering@sso-groups.example.com'],
		});

		await gotoAuthDomains(page);
		await openConfigureAuthDomain(page, domain);
		await page.getByTestId('google-auth-workspace-groups-header').click();

		const fetchGroups = page
			.getByTestId('google-auth-fetch-groups')
			.getByRole('checkbox');
		await expect(fetchGroups).toBeChecked();
		await expect(
			page
				.getByTestId('google-auth-allowed-groups')
				.locator('.ant-select-selection-item'),
		).toHaveCount(1);
		await fetchGroups.click();
		await expect(fetchGroups).not.toBeChecked();

		await page.getByTestId('auth-domain-save').click();
		await expect(page.getByText('Domain updated successfully')).toBeVisible();
		await expect(page.getByTestId('auth-domain-form')).toBeHidden();

		await openConfigureAuthDomain(page, domain);
		await page.getByTestId('google-auth-workspace-groups-header').click();
		await expect(fetchGroups).not.toBeChecked();
		// Re-enable to reveal the group fields: the allowed-groups list must be
		// empty, not repopulated from the pre-disable state.
		await fetchGroups.click();
		await expect(
			page
				.getByTestId('google-auth-allowed-groups')
				.locator('.ant-select-selection-item'),
		).toHaveCount(0);
	});

	test('TC-06 enforce sso toggle persists across reload', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-toggle.example.com';
		cleanupNames.push(domain);
		await createGoogleAuthDomainViaApi(page, { name: domain, enabled: false });

		await gotoAuthDomains(page);
		const toggle = (await findAuthDomainRow(page, domain)).getByTestId(
			'auth-domain-enforce-sso',
		);
		await expect(toggle).not.toBeChecked();

		await toggle.click();
		await expect(toggle).toBeChecked();
		// The switch is disabled while the update is in flight; wait for it to
		// settle before reloading so the reload reads the persisted value.
		await expect(toggle).toBeEnabled();

		await page.reload();
		const reloadedRow = await findAuthDomainRow(page, domain);
		await expect(
			reloadedRow.getByTestId('auth-domain-enforce-sso'),
		).toBeChecked();
	});

	test('TC-07 delete a domain via the UI', async ({ authedPage: page }) => {
		const removed = 'sso-delete.example.com';
		const kept = 'sso-delete-keep.example.com';
		cleanupNames.push(removed, kept);
		await createGoogleAuthDomainViaApi(page, { name: removed });
		await createGoogleAuthDomainViaApi(page, { name: kept });

		await gotoAuthDomains(page);
		const row = await findAuthDomainRow(page, removed);
		await row.getByTestId('auth-domain-delete').click();
		await page.getByTestId('auth-domain-delete-confirm').click();

		await expect(page.getByText('Domain deleted successfully')).toBeVisible();
		await expect(page.getByTestId(`auth-domain-row-${removed}`)).toHaveCount(0);
		await expect(page.getByTestId(`auth-domain-row-${kept}`)).toHaveCount(1);
	});

	test('TC-08 enforce sso toggle preserves the role mapping', async ({
		authedPage: page,
	}) => {
		const domain = 'sso-toggle-rolemap.example.com';
		cleanupNames.push(domain);
		await createGoogleAuthDomainViaApi(page, {
			name: domain,
			enabled: false,
			roleMapping: {
				defaultRole: 'signoz-editor',
				groupMappings: { engineers: 'signoz-editor', support: 'signoz-viewer' },
			},
		});

		await gotoAuthDomains(page);
		const toggle = (await findAuthDomainRow(page, domain)).getByTestId(
			'auth-domain-enforce-sso',
		);
		await toggle.click();
		await expect(toggle).toBeChecked();
		await expect(toggle).toBeEnabled();

		await page.reload();
		await openConfigureAuthDomain(page, domain);
		await page.getByTestId('role-mapping-header').click();

		const rows = page.getByTestId('role-mapping-row');
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(0).getByTestId('role-mapping-group-name')).toHaveValue(
			'engineers',
		);
		await expect(rows.nth(1).getByTestId('role-mapping-group-name')).toHaveValue(
			'support',
		);
	});
});
