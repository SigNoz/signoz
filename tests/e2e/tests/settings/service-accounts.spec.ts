import { expect, test } from '../../drivers/settings';

test.describe('settings — service accounts', () => {
	test('TC-01 a service account created in the UI opens its drawer and lists', async ({
		settings,
	}, testInfo) => {
		const name = `e2e-sa-ui-w${testInfo.workerIndex}-${Date.now()}`;
		try {
			await settings.serviceAccounts.goto();
			await settings.serviceAccounts.create(name);

			await expect(
				settings.toast('Service account created successfully'),
			).toBeVisible();
			await expect(settings.serviceAccounts.drawer()).toBeVisible();

			await settings.serviceAccounts.closeDrawer();
			await settings.serviceAccounts.search(name);
			await expect(settings.serviceAccounts.row(name)).toBeVisible();
		} finally {
			await settings.serviceAccounts.removeByName(name);
		}
	});

	test('TC-02 a key shown once authenticates, and revoking it stops it working', async ({
		settings,
		serviceAccount,
	}) => {
		await settings.serviceAccounts.openKeys(serviceAccount.id);
		const key = await settings.serviceAccounts.addKey('k1');

		await expect(settings.serviceAccounts.keyCreatedCallout()).toBeVisible();
		expect(
			await settings.serviceAccounts.callWithKey(key, '/api/v2/dashboards'),
		).toBe(200);

		await settings.serviceAccounts.closeKeyModal();
		await settings.serviceAccounts.revokeKey('k1');
		await expect
			.poll(() => settings.serviceAccounts.callWithKey(key, '/api/v2/dashboards'))
			.toBe(401);
	});

	test('TC-03 a role assigned in the drawer persists', async ({
		settings,
		serviceAccount,
	}) => {
		await settings.serviceAccounts.openAccount(serviceAccount.id);
		await settings.serviceAccounts.setRoles(['signoz-editor']);
		await settings.serviceAccounts.save();

		await settings.reload();
		await expect(settings.serviceAccounts.roleSelect()).toContainText(
			'signoz-editor',
		);
		const account = await settings.serviceAccounts.apiAccount(serviceAccount.id);
		expect(
			(account.serviceAccountRoles ?? []).map((entry) => entry.role.name),
		).toEqual(['signoz-editor']);
	});

	test('TC-04 deleting an account moves it to Deleted', async ({
		settings,
		serviceAccount,
	}) => {
		await settings.serviceAccounts.openAccount(serviceAccount.id);
		await settings.serviceAccounts.delete();

		await settings.serviceAccounts.filter('Deleted');
		await settings.serviceAccounts.search(serviceAccount.name);
		await expect(settings.serviceAccounts.row(serviceAccount.name)).toBeVisible();
	});
});
