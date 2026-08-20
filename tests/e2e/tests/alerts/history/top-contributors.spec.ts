import { expect, test } from '../../../fixtures/alert-history';
import { gotoAlertHistory } from '../../../helpers/alerts';

test.describe('Alert history — top contributors', () => {
	test('TC-01 card displays max 3 rows with count ratios', async ({
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

	// AS-05 reads the `count/total` text, which a *different* column renders than
	// the bar does. Dropping the `/ total * 100` scaling from the bar leaves that
	// text untouched, so the width needs its own assertion. Radix surfaces the
	// clamped percent as `aria-valuenow`.
	test('TC-02 contributor bar width is the count as a percentage of the total', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const rows = page
			.getByTestId('top-contributors-card')
			.getByTestId('top-contributors-row');
		await expect(rows).toHaveCount(3);

		// Every SEED-A contributor fired exactly once out of `total`.
		const percent = String((1 / alertHistory.total) * 100);
		for (let i = 0; i < 3; i += 1) {
			await expect(rows.nth(i).getByRole('progressbar')).toHaveAttribute(
				'aria-valuenow',
				percent,
			);
		}
	});

	test('TC-03 "View all" button only appears when more than 3 contributors', async ({
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

	test('TC-04 View-all drawer shows paginated list of all contributors', async ({
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

	test('TC-05 drawer opens from deep link with ?viewAllTopContributors=true', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			viewAllTopContributors: 'true',
		});

		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('TC-06 View-all click adds ?viewAllTopContributors=true to URL', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('top-contributors-view-all').click();

		await expect(page).toHaveURL(/[?&]viewAllTopContributors=true/);
		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('TC-07 contributor rows show related-logs link for logs-based rules', async ({
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
