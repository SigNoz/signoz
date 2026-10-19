import { expect, test } from '../../drivers/settings';

test.describe('settings — organization', () => {
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
});
