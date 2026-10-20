import { expect, test } from '../../drivers/onboarding';

test.describe('onboarding redirect', () => {
	// The viewer logs in through the UI on first use, and settle() waits for idle.
	test.describe.configure({ timeout: 60_000 });

	test('TC-06 an admin in an org with several users stays on /home', async ({
		onboarding,
	}) => {
		await onboarding.stubFirstRun({ users: 'several' });
		await onboarding.visit('/home');
		await expect(onboarding.homePage()).toBeVisible();
		await onboarding.settle();
		expect(onboarding.pathname()).toBe('/home');
	});

	test.describe('as a viewer', () => {
		test.use({ as: 'viewer' });

		test('TC-07 a viewer in a first-run org stays on /home', async ({
			onboarding,
		}) => {
			await onboarding.stubFirstRun();
			await onboarding.visit('/home');
			await expect(onboarding.homePage()).toBeVisible();
			await onboarding.settle();
			expect(onboarding.pathname()).toBe('/home');
		});
	});
});
