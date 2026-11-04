import { expect, grantAll, roleName, test } from '../../drivers/settings';

test.describe('settings — roles', () => {
	test('TC-01 managed roles are listed and read-only', async ({ settings }) => {
		await settings.roles.goto();
		await settings.roles.search('signoz-');
		for (const role of ['signoz-admin', 'signoz-editor', 'signoz-viewer']) {
			await expect(settings.roles.row(role)).toBeVisible();
		}

		await settings.roles.row('signoz-viewer').click();
		await expect(settings.roles.viewPage()).toBeVisible();
		await expect(settings.roles.deleteButton()).toBeDisabled();
		await expect(settings.roles.updateButton()).toBeDisabled();
	});

	test('TC-02 a custom role created in the editor is persisted with its grants', async ({
		settings,
	}, testInfo) => {
		const name = roleName('ui', testInfo.workerIndex);
		try {
			await settings.roles.goto();
			await settings.roles.openCreate();
			await settings.roles.fillName(name);
			await settings.roles.fillDescription('created by the e2e suite');
			await settings.roles.grant('dashboard', 'read', 'all');
			await settings.roles.save();

			await expect(settings.toast('Role created successfully')).toBeVisible();
			await expect.poll(() => settings.pathname()).toBe('/settings/roles');
			await settings.roles.search(name);
			await expect(settings.roles.row(name)).toBeVisible();

			const id = await settings.roles.idByName(name);
			expect(id).toBeDefined();
			const role = await settings.roles.apiRole(id ?? '');
			expect(role.transactionGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						relation: 'read',
						objectGroup: expect.objectContaining({
							resource: expect.objectContaining({ kind: 'dashboard' }),
						}),
					}),
				]),
			);

			await settings.roles.view(id ?? '', name);
			await expect(settings.roles.grantedCount('dashboard')).not.toHaveText(/^0 /);
		} finally {
			await settings.roles.removeByName(name);
		}
	});

	test('TC-03 editing a custom role updates the view page', async ({
		settings,
		customRole,
	}) => {
		const description = `edited ${Date.now()}`;
		await settings.roles.view(customRole.id, customRole.name);
		await expect(settings.roles.grantedCount('serviceaccount')).toHaveText(/^0 /);

		await settings.roles.openEdit();
		await settings.roles.fillDescription(description);
		await settings.roles.grant('serviceaccount', 'read', 'all');
		await settings.roles.save();

		await expect(settings.toast('Role updated successfully')).toBeVisible();
		await expect(settings.roles.viewPage()).toBeVisible();
		await expect(settings.roles.viewPage()).toContainText(description);
		await expect(settings.roles.grantedCount('serviceaccount')).not.toHaveText(
			/^0 /,
		);

		await settings.reload();
		await expect(settings.roles.viewPage()).toContainText(description);
		await expect(settings.roles.grantedCount('serviceaccount')).not.toHaveText(
			/^0 /,
		);
	});

	test('TC-04 deleting a custom role removes it from the list', async ({
		settings,
	}, testInfo) => {
		const name = roleName('del', testInfo.workerIndex);
		const id = await settings.roles.createApi({
			name,
			transactionGroups: [grantAll('read', 'dashboard')],
		});
		try {
			await settings.roles.view(id, name);
			await settings.roles.delete();

			await expect.poll(() => settings.pathname()).toBe('/settings/roles');
			await settings.roles.search(name);
			await expect(settings.roles.row(name)).toHaveCount(0);
		} finally {
			await settings.roles.removeApi(id);
		}
	});

	test('TC-05 a user with a custom role sees only what it grants', async ({
		settings,
		customRole,
		authFlows,
	}, testInfo) => {
		const title = `e2e-role-dash-w${testInfo.workerIndex}-${Date.now()}`;
		const dashboard = await settings.seedDashboard(title);
		const member = await settings.users.createActive(
			customRole.name,
			`custom-w${testInfo.workerIndex}-${Date.now()}`,
		);
		try {
			await authFlows.login(member.user);

			await expect(await authFlows.findDashboard(title)).toBeVisible();
			await expect(authFlows.newDashboardButton()).toHaveAttribute(
				'data-denied-permissions',
				/.+/,
			);
		} finally {
			await settings.users.remove(member.id);
			await settings.removeDashboard(dashboard.id);
		}
	});
});
