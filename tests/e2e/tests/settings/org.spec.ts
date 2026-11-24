import {
	createGrantedUser,
	expect,
	grantAll,
	test,
} from '../../drivers/settings';

test.describe('settings — organization', () => {
	// The display name is org-wide, so the tests that rename it must not overlap.
	test.describe.configure({ mode: 'serial' });

	test('TC-01 an org display-name edit persists', async ({
		settings,
	}, testInfo) => {
		const original = await settings.org.apiName();
		const name = `e2e-org-w${testInfo.workerIndex}-${Date.now()}`;
		try {
			await settings.org.goto();
			await expect(settings.org.nameInput()).toHaveValue(original);

			await settings.org.rename(name);
			await expect(settings.toast('Success')).toBeVisible();

			await settings.reload();
			await expect(settings.org.nameInput()).toHaveValue(name);
			expect(await settings.org.apiName()).toBe(name);
		} finally {
			await settings.org.setApiName(original);
		}
	});

	test('TC-02 a user without update:organization has the display name locked', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'org-read',
			[grantAll('read', 'organization', 'organization')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.org.goto();

			await expect(guestSettings.org.nameInput()).toBeDisabled();
			await expect(guestSettings.org.nameInput()).toHaveAttribute(
				'data-denied-permissions',
				/update/,
			);
			await expect(guestSettings.org.submitButton()).toHaveAttribute(
				'data-denied-permissions',
				/update/,
			);
		} finally {
			await member.remove();
		}
	});

	test('TC-03 a user with update:organization can change the display name', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'org-update',
			[
				grantAll('read', 'organization', 'organization'),
				grantAll('update', 'organization', 'organization'),
			],
		);
		const original = await settings.org.apiName();
		const name = `e2e-org-granted-w${testInfo.workerIndex}-${Date.now()}`;
		try {
			await authFlows.login(member.user);
			await guestSettings.org.goto();

			await guestSettings.org.rename(name);
			await expect(guestSettings.toast('Success')).toBeVisible();
			expect(await settings.org.apiName()).toBe(name);
		} finally {
			await settings.org.setApiName(original);
			await member.remove();
		}
	});

	test('TC-04 a user without list:auth-domain sees the denial instead of the domains', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'no-domains',
			[grantAll('read', 'organization', 'organization')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.org.goto();

			await expect(guestSettings.org.deniedMessage()).toBeVisible();
			await expect(guestSettings.org.deniedMessage()).toContainText(/auth-domain/);
		} finally {
			await member.remove();
		}
	});
});

test.describe('settings — organization as a viewer', () => {
	test.use({ as: 'viewer' });

	test('TC-05 a viewer reaches org settings with the display name and the domains denied', async ({
		settings,
	}) => {
		await settings.org.goto();

		await expect(settings.org.authDomainTitle()).toBeVisible();
		await expect(settings.org.deniedMessage()).toBeVisible();
		await expect(settings.org.nameInput()).toHaveCount(0);
		await expect(settings.org.submitButton()).toHaveCount(0);
	});
});
