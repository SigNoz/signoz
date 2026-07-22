import { expect, test } from '../../fixtures/auth';
import {
	createEmailChannelViaApi,
	createThresholdAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	gotoAlertOverview,
} from '../../helpers/alerts';
import { newAdminContext } from '../../helpers/auth';

test('TC-01 alerts page — tabs render', async ({ authedPage: page }) => {
	await page.goto('/alerts');
	await expect(page.getByRole('tab', { name: /alert rules/i })).toBeVisible();
	await expect(page.getByRole('tab', { name: /configuration/i })).toBeVisible();
});

test.describe('alerts — threshold persists on edit-page load', () => {
	const TARGET = 245;
	let ruleId: string;
	let channelId: string;

	test.beforeAll(async ({ browser }) => {
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		try {
			const stamp = Date.now();
			const channel = await createEmailChannelViaApi(
				page,
				`e2e-threshold-persistence-ch-${stamp}`,
			);
			channelId = channel.id;
			ruleId = await createThresholdAlertViaApi(page, {
				name: `e2e-threshold-persistence-${stamp}`,
				target: TARGET,
				channels: [channel.name],
			});
		} finally {
			await ctx.close();
		}
	});

	test.afterAll(async ({ browser }) => {
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		try {
			if (ruleId) {
				await deleteAlertViaApi(page, ruleId);
			}
			if (channelId) {
				await deleteChannelViaApi(page, channelId);
			}
		} finally {
			await ctx.close();
		}
	});

	test('TC-02 edit page shows the saved threshold value', async ({
		authedPage: page,
	}) => {
		await gotoAlertOverview(page, ruleId);

		// The condition editor should show the persisted target once loaded.
		await expect(page.getByTestId('threshold-value-input')).toHaveValue(
			String(TARGET),
		);
	});
});
