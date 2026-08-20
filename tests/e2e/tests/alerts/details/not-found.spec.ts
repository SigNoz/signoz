import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	ALERT_HISTORY_PATH,
	ALERT_OVERVIEW_PATH,
} from '../../../helpers/alerts';

test.describe('Alert details — not found', () => {
	test('TC-01 invalid ruleId shows AlertNotFound page', async ({
		authedPage: page,
	}) => {
		await page.goto(`${ALERT_HISTORY_PATH}?ruleId=not-a-real-rule-id`);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();

		await page.goto(
			`${ALERT_HISTORY_PATH}?ruleId=01920000-0000-7000-8000-000000000000`,
		);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();
	});

	test('TC-02 missing ruleId on overview shows AlertNotFound page', async ({
		authedPage: page,
	}) => {
		await page.goto(ALERT_OVERVIEW_PATH);

		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();
	});
});
