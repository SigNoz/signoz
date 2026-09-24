import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	gotoAlertHistory,
	statsCard,
	timelineRows,
} from '../../../helpers/alerts/history';

test.describe('Alert history — statistics', () => {
	test('TC-01 Total Triggered card shows the firing count', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = statsCard(page, 'Total Triggered');
		await expect(card).toBeVisible();
		await expect(card).toHaveAttribute('data-empty', 'false');
		await expect(card.getByTestId('stats-card-value')).toHaveText(
			String(alertHistory.total),
		);
	});

	test('TC-02 Avg. Resolution Time card shows "No Resolutions." when none exist', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = statsCard(page, 'Avg. Resolution Time');
		await expect(card).toBeVisible();
		await expect(card).toHaveAttribute('data-empty', 'true');
		const value = card.getByTestId('stats-card-value');
		await expect(value).toHaveText('No Resolutions.');
		await expect(value).not.toHaveText(/NaN/);
		await expect(card.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	test('TC-03 empty stats card never renders a sparkline', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const empty = statsCard(page, 'Avg. Resolution Time');
		await expect(empty).toHaveAttribute('data-empty', 'true');
		await expect(empty.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('TC-04 sparkline present with a multi-point series', async () => {
		test.skip(
			true,
			'Not deterministic on SEED-A: whether `currentTriggersSeries` lands in ' +
				'one stats bucket or two depends on where the ~2-minute seed falls ' +
				'relative to the bucket boundary, so the `timeSeries.length > 1` gate ' +
				'flips between runs (observed both ways). Needs a fixture that ' +
				'guarantees ≥2 points — see coverage doc §3.5.',
		);
	});

	test('TC-05 change-vs-past indicator shows "no previous data" when unavailable', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = statsCard(page, 'Total Triggered');
		await expect(card.getByTestId('stats-card-change')).toHaveText(
			'no previous data',
		);
	});

	test('TC-06 stats update when time range changes', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const end = Date.now() - 24 * 60 * 60 * 1000;
		const start = end - 30 * 60 * 1000;
		await gotoAlertHistory(page, alertHistory.ruleId, {
			startTime: String(start),
			endTime: String(end),
		});

		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText('None Triggered.');
		await expect(
			statsCard(page, 'Avg. Resolution Time').getByTestId('stats-card-value'),
		).toHaveText('No Resolutions.');

		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText(String(alertHistory.total));
	});

	test('TC-07 Avg. Resolution Time shows formatted duration when resolutions exist', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId);

		const card = statsCard(page, 'Avg. Resolution Time');
		await expect(card).toHaveAttribute('data-empty', 'false');
		await expect(card.getByTestId('stats-card-value')).not.toHaveText(
			'No Resolutions.',
		);
		await expect(card.getByTestId('stats-card-value')).not.toHaveText('');
		await expect(card.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	test('TC-08 Total Triggered counts only firing rows (not resolved)', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId);

		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText(String(resolvedHistory.firingCount));
		await expect(timelineRows(page)).toHaveCount(
			resolvedHistory.firingCount + resolvedHistory.resolvedCount,
		);
	});
});
