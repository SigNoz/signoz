import { expect, test } from '../../../fixtures/alert-history';
import { gotoAlertHistory } from '../../../helpers/alerts';

test.describe('Alert history — top contributors', () => {
	test('AS-05 card displays max 3 rows with count ratios', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = page.getByTestId('top-contributors-card');
		await expect(card).toBeVisible();
		await expect(card).toContainText('top contributors');

		const rows = card.getByTestId('top-contributors-row');
		await expect(rows).toHaveCount(3);
		for (let i = 0; i < 3; i += 1) {
			await expect(
				rows.nth(i).getByTestId('top-contributors-row-count'),
			).toHaveText(`1/${alertHistory.total}`);
			await expect(rows.nth(i)).toContainText('service.name');
		}
	});

	test('AS-06 "View all" button only appears when more than 3 contributors', async ({
		authedPage: page,
		alertHistory,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(page.getByTestId('top-contributors-view-all')).toBeVisible();

		await gotoAlertHistory(page, metricsHistory.ruleId);
		await expect(page.getByTestId('top-contributors-card')).toBeVisible();
		await expect(page.getByTestId('top-contributors-view-all')).toHaveCount(0);
	});

	test('AS-07 View-all drawer shows paginated list of all contributors', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page.getByTestId('top-contributors-view-all').click();

		const drawer = page.getByTestId('top-contributors-drawer');
		await expect(drawer).toBeVisible();
		await expect(page.getByText('Viewing All Contributors')).toBeVisible();
		await expect(drawer.getByTestId('top-contributors-row')).toHaveCount(10);
		await expect(drawer.locator('.total')).toHaveText(
			` of ${alertHistory.total}`,
		);
	});

	test('AS-07b drawer opens from deep link with ?viewAllTopContributors=true', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			viewAllTopContributors: 'true',
		});

		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('AS-08 View-all click adds ?viewAllTopContributors=true to URL', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('top-contributors-view-all').click();

		await expect(page).toHaveURL(/[?&]viewAllTopContributors=true/);
		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('AS-10 contributor rows show related-logs link for logs-based rules', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page
			.getByTestId('top-contributors-card')
			.getByTestId('top-contributors-row')
			.first()
			.getByTestId('top-contributors-row-count')
			.click();

		await expect(page.getByTestId('alert-popover-view-logs')).toBeVisible();
		await expect(page.getByTestId('alert-popover-view-traces')).toHaveCount(0);
	});
});
