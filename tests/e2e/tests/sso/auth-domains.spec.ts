import { expect, test } from '../../fixtures/auth';
import {
	createGoogleAuthDomainViaApi,
	deleteAuthDomainByNameViaApi,
	gotoAuthDomains,
	openConfigureAuthDomain,
	ORG_SETTINGS_PATH,
} from '../../helpers/sso';

// Every test seeds its own uniquely-named domain so the file can run fully
// parallel. Names are registered here and removed by the afterEach guard;
// the delete-by-name call before each seed clears leftovers of crashed runs.
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
	await expect(
		page.getByRole('heading', { name: 'Authenticated Domains' }),
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add Domain' })).toBeVisible();
});

test('TC-02 create a google auth domain via the UI', async ({
	authedPage: page,
}) => {
	const domain = 'sso-create.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);

	await gotoAuthDomains(page);
	await page.getByRole('button', { name: 'Add Domain' }).click();
	await page
		.locator('.provider')
		.filter({ hasText: 'Google Apps Authentication' })
		.getByRole('button', { name: 'Configure' })
		.click();

	await page.locator('#google-domain').fill(domain);
	await page
		.locator('#google-client-id')
		.fill('e2e-client-id.apps.googleusercontent.com');
	await page.locator('#google-client-secret').fill('e2e-client-secret');
	await page.getByRole('button', { name: 'Save Changes' }).click();

	await expect(page.getByText('Domain created successfully')).toBeVisible();
	const row = page.getByRole('row', { name: domain });
	await expect(row).toBeVisible();
	await expect(
		row.getByRole('button', { name: 'Configure Google Auth' }),
	).toBeVisible();
});

test('TC-03 editing the client id persists across reopen', async ({
	authedPage: page,
}) => {
	const domain = 'sso-edit.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);
	await createGoogleAuthDomainViaApi(page, { name: domain });

	await gotoAuthDomains(page);
	await openConfigureAuthDomain(page, domain);
	await expect(page.locator('#google-client-id')).toHaveValue(
		'e2e-client-id.apps.googleusercontent.com',
	);
	await page
		.locator('#google-client-id')
		.fill('rotated-client-id.apps.googleusercontent.com');
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await expect(page.getByText('Domain updated successfully')).toBeVisible();
	await expect(page.getByRole('dialog')).toBeHidden();

	await openConfigureAuthDomain(page, domain);
	await expect(page.locator('#google-client-id')).toHaveValue(
		'rotated-client-id.apps.googleusercontent.com',
	);
});

test('TC-04 removing a group mapping persists after save', async ({
	authedPage: page,
}) => {
	const domain = 'sso-rolemap.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);
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
	// The collapse header nests two elements with the same button role, so
	// target the unique heading inside it.
	await page.getByRole('heading', { name: 'Role Mapping (Advanced)' }).click();

	const rows = page.locator('.role-mapping-section__row');
	await expect(rows).toHaveCount(2);
	// Go marshals map keys sorted, so "engineers" is always the first row.
	await expect(rows.nth(0).getByPlaceholder('IDP Group Name')).toHaveValue(
		'engineers',
	);
	await rows.nth(0).getByRole('button', { name: 'Remove mapping' }).click();
	await expect(rows).toHaveCount(1);

	// The PUT body is the #2402 contract: the removed mapping must be gone
	// from the payload, not just from the form state.
	const putRequest = page.waitForRequest(
		(req) =>
			req.method() === 'PUT' && req.url().includes('/api/v2/auth_domains/'),
	);
	await page.getByRole('button', { name: 'Save Changes' }).click();
	const body = JSON.parse((await putRequest).postData() ?? '{}');
	expect(body.roleMapping?.groupMappings).toEqual({
		support: 'signoz-viewer',
	});
	await expect(page.getByText('Domain updated successfully')).toBeVisible();
	await expect(page.getByRole('dialog')).toBeHidden();

	await openConfigureAuthDomain(page, domain);
	await page.getByRole('heading', { name: 'Role Mapping (Advanced)' }).click();
	await expect(rows).toHaveCount(1);
	await expect(rows.getByPlaceholder('IDP Group Name')).toHaveValue('support');
});

test('TC-05 disabling fetch groups clears the allowed groups', async ({
	authedPage: page,
}) => {
	const domain = 'sso-groups.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);
	await createGoogleAuthDomainViaApi(page, {
		name: domain,
		fetchGroups: true,
		serviceAccountJson: '{"type":"service_account","project_id":"e2e"}',
		domainToAdminEmail: { '*': 'admin@sso-groups.example.com' },
		allowedGroups: ['engineering@sso-groups.example.com'],
	});

	await gotoAuthDomains(page);
	await openConfigureAuthDomain(page, domain);
	await page.getByText('Google Workspace Groups (Advanced)').click();

	const fetchGroups = page.getByRole('checkbox', { name: 'Fetch Groups' });
	await expect(fetchGroups).toBeChecked();
	await expect(
		page.locator('.email-tag-input .ant-select-selection-item'),
	).toHaveCount(1);
	await fetchGroups.click();
	await expect(fetchGroups).not.toBeChecked();

	// The PUT body is the #2402 contract: with fetchGroups off, the payload
	// must drop allowedGroups instead of resending the stale list.
	const putRequest = page.waitForRequest(
		(req) =>
			req.method() === 'PUT' && req.url().includes('/api/v2/auth_domains/'),
	);
	await page.getByRole('button', { name: 'Save Changes' }).click();
	const spec = JSON.parse((await putRequest).postData() ?? '{}').config?.spec;
	expect(spec?.fetchGroups).toBeFalsy();
	expect(spec?.allowedGroups).toBeUndefined();
	expect(spec?.domainToAdminEmail).toEqual({});
	await expect(page.getByText('Domain updated successfully')).toBeVisible();
	await expect(page.getByRole('dialog')).toBeHidden();

	await openConfigureAuthDomain(page, domain);
	await page.getByText('Google Workspace Groups (Advanced)').click();
	await expect(fetchGroups).not.toBeChecked();
	// Re-enable to reveal the group fields: the allowed-groups list must be
	// empty, not repopulated from the pre-disable state.
	await fetchGroups.click();
	await expect(
		page.locator('.email-tag-input .ant-select-selection-item'),
	).toHaveCount(0);
});

test('TC-06 enforce sso toggle persists across reload', async ({
	authedPage: page,
}) => {
	const domain = 'sso-toggle.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);
	await createGoogleAuthDomainViaApi(page, { name: domain, enabled: false });

	await gotoAuthDomains(page);
	const toggle = page.getByRole('row', { name: domain }).getByRole('switch');
	await expect(toggle).not.toBeChecked();

	const putResponse = page.waitForResponse(
		(res) =>
			res.request().method() === 'PUT' &&
			res.url().includes('/api/v2/auth_domains/'),
	);
	await toggle.click();
	expect((await putResponse).status()).toBe(204);

	await page.reload();
	await expect(
		page.getByRole('row', { name: domain }).getByRole('switch'),
	).toBeChecked();
});

test('TC-07 delete a domain via the UI', async ({ authedPage: page }) => {
	const domain = 'sso-delete.example.com';
	cleanupNames.push(domain);
	await deleteAuthDomainByNameViaApi(page, domain);
	await createGoogleAuthDomainViaApi(page, { name: domain });

	await gotoAuthDomains(page);
	await page
		.getByRole('row', { name: domain })
		.getByRole('button', { name: 'Delete' })
		.click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: 'Delete Domain' })
		.click();

	await expect(page.getByText('Domain deleted successfully')).toBeVisible();
	await expect(page.getByRole('cell', { name: domain })).toHaveCount(0);
});
