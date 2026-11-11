import { expect, test } from '../../drivers/sso';

test.describe('SSO auth domains', () => {
	// Every test seeds its own uniquely-named domain so the file can run fully
	// parallel. Names are registered here and removed by the afterEach guard.
	const cleanupNames: string[] = [];

	test.afterEach(async ({ sso }) => {
		for (const name of cleanupNames.splice(0)) {
			await sso.deleteDomainByName(name);
		}
	});

	test('TC-01 org settings shows the authenticated domains section', async ({
		sso,
	}) => {
		await sso.goto();
		await expect(sso.title()).toBeVisible();
		await expect(sso.addButton()).toBeVisible();
	});

	test('TC-02 create a google auth domain via the UI', async ({ sso }) => {
		const domain = 'sso-create.example.com';
		cleanupNames.push(domain);

		await sso.goto();
		await sso.addButton().click();
		await sso.configureProvider('google').click();

		await sso.form.googleDomain().fill(domain);
		await sso.form
			.googleClientId()
			.fill('e2e-client-id.apps.googleusercontent.com');
		await sso.form.googleClientSecret().fill('e2e-client-secret');
		await sso.form.save().click();

		await expect(sso.toast('Domain created successfully')).toBeVisible();
		await expect(sso.configureButton(domain)).toHaveText('Configure Google Auth');
	});

	test('TC-03 editing the client id persists across reopen', async ({ sso }) => {
		const domain = 'sso-edit.example.com';
		cleanupNames.push(domain);
		await sso.createGoogleDomain({ name: domain });

		await sso.goto();
		await sso.openConfigure(domain);
		await expect(sso.form.googleClientId()).toHaveValue(
			'e2e-client-id.apps.googleusercontent.com',
		);
		await sso.form
			.googleClientId()
			.fill('rotated-client-id.apps.googleusercontent.com');
		await sso.form.save().click();
		await expect(sso.toast('Domain updated successfully')).toBeVisible();
		await expect(sso.form.root()).toBeHidden();

		await sso.openConfigure(domain);
		await expect(sso.form.googleClientId()).toHaveValue(
			'rotated-client-id.apps.googleusercontent.com',
		);
	});

	test('TC-04 removing a group mapping persists after save', async ({ sso }) => {
		const domain = 'sso-rolemap.example.com';
		cleanupNames.push(domain);
		await sso.createGoogleDomain({
			name: domain,
			roleMapping: {
				defaultRole: 'signoz-viewer',
				groupMappings: {
					engineers: 'signoz-editor',
					support: 'signoz-viewer',
				},
			},
		});

		await sso.goto();
		await sso.openConfigure(domain);
		await sso.roleMapping.header().click();

		const rows = sso.roleMapping.rows();
		await expect(rows).toHaveCount(2);
		// Go marshals map keys sorted, so "engineers" is always the first row.
		await expect(sso.roleMapping.groupName(0)).toHaveValue('engineers');
		await sso.roleMapping.remove(0).click();
		await expect(rows).toHaveCount(1);

		await sso.form.save().click();
		await expect(sso.toast('Domain updated successfully')).toBeVisible();
		await expect(sso.form.root()).toBeHidden();

		await sso.openConfigure(domain);
		await sso.roleMapping.header().click();
		await expect(rows).toHaveCount(1);
		await expect(sso.roleMapping.groupName(0)).toHaveValue('support');
	});

	test('TC-05 disabling fetch groups clears the allowed groups', async ({
		sso,
	}) => {
		const domain = 'sso-groups.example.com';
		cleanupNames.push(domain);
		await sso.createGoogleDomain({
			name: domain,
			fetchGroups: true,
			serviceAccountJson: '{"type":"service_account","project_id":"e2e"}',
			domainToAdminEmail: { '*': 'admin@sso-groups.example.com' },
			allowedGroups: ['engineering@sso-groups.example.com'],
		});

		await sso.goto();
		await sso.openConfigure(domain);
		await sso.workspaceGroups.header().click();

		const fetchGroups = sso.workspaceGroups.fetchGroups();
		await expect(fetchGroups).toBeChecked();
		await expect(sso.workspaceGroups.allowedGroups()).toHaveCount(1);
		await fetchGroups.click();
		await expect(fetchGroups).not.toBeChecked();

		await sso.form.save().click();
		await expect(sso.toast('Domain updated successfully')).toBeVisible();
		await expect(sso.form.root()).toBeHidden();

		await sso.openConfigure(domain);
		await sso.workspaceGroups.header().click();
		await expect(fetchGroups).not.toBeChecked();
		// Re-enable to reveal the group fields: the allowed-groups list must be
		// empty, not repopulated from the pre-disable state.
		await fetchGroups.click();
		await expect(sso.workspaceGroups.allowedGroups()).toHaveCount(0);
	});

	test('TC-06 enforce sso toggle persists across reload', async ({
		authedPage: page,
		sso,
	}) => {
		const domain = 'sso-toggle.example.com';
		cleanupNames.push(domain);
		await sso.createGoogleDomain({ name: domain, enabled: false });

		await sso.goto();
		const toggle = sso.enforceSsoToggle(domain);
		await expect(toggle).not.toBeChecked();

		await toggle.click();
		await expect(toggle).toBeChecked();
		// The switch is disabled while the update is in flight; wait for it to
		// settle before reloading so the reload reads the persisted value.
		await expect(toggle).toBeEnabled();

		await page.reload();
		await expect(sso.enforceSsoToggle(domain)).toBeChecked();
	});

	test('TC-07 delete a domain via the UI', async ({ sso }) => {
		const removed = 'sso-delete.example.com';
		const kept = 'sso-delete-keep.example.com';
		cleanupNames.push(removed, kept);
		await sso.createGoogleDomain({ name: removed });
		await sso.createGoogleDomain({ name: kept });

		await sso.goto();
		await sso.deleteButton(removed).click();
		await sso.deleteConfirmButton().click();

		await expect(sso.toast('Domain deleted successfully')).toBeVisible();
		await expect(sso.row(removed)).toHaveCount(0);
		await expect(sso.row(kept)).toHaveCount(1);
	});

	test('TC-08 enforce sso toggle preserves the role mapping', async ({
		authedPage: page,
		sso,
	}) => {
		const domain = 'sso-toggle-rolemap.example.com';
		cleanupNames.push(domain);
		await sso.createGoogleDomain({
			name: domain,
			enabled: false,
			roleMapping: {
				defaultRole: 'signoz-editor',
				groupMappings: { engineers: 'signoz-editor', support: 'signoz-viewer' },
			},
		});

		await sso.goto();
		const toggle = sso.enforceSsoToggle(domain);
		await toggle.click();
		await expect(toggle).toBeChecked();
		await expect(toggle).toBeEnabled();

		await page.reload();
		await sso.openConfigure(domain);
		await sso.roleMapping.header().click();

		await expect(sso.roleMapping.rows()).toHaveCount(2);
		await expect(sso.roleMapping.groupName(0)).toHaveValue('engineers');
		await expect(sso.roleMapping.groupName(1)).toHaveValue('support');
	});
});
