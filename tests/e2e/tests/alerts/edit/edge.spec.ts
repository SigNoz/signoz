import { expect, test } from '../../../fixtures/alerts/alert-rules';
import { ALERT_EDIT_PATH } from '../../../helpers/alert-forms';
import { ALERT_OVERVIEW_PATH } from '../../../helpers/alerts';

// TC-* — what the edit routes do with an unknown ruleId.
//
// `pages/EditRules`'s own error branches are unreachable: `/alerts/edit` is a
// legacy alias redirected to `/alerts/overview` before any route matches
// (`AppRoutes/Private.tsx`), and the details shell validates the id before
// rendering the Overview tab. So neither the "Rule Id is required" notification nor
// the `edit-rules-container--error` card can ever render — this file asserts the
// behaviour that replaces them.

const UNKNOWN_RULE_ID = '999999999';

test.describe('Alert edit — routing edges', () => {
	test('TC-01 an unknown ruleId shows AlertNotFound on both entry URLs', async ({
		authedPage: page,
	}) => {
		for (const entry of [
			`${ALERT_OVERVIEW_PATH}?ruleId=${UNKNOWN_RULE_ID}`,
			`${ALERT_EDIT_PATH}?ruleId=${UNKNOWN_RULE_ID}`,
		]) {
			// eslint-disable-next-line no-await-in-loop
			await page.goto(entry);

			// `AlertDetails.tsx` returns AlertNotFound before the provider or the editor
			// mount, so neither the details root nor the standalone route's error card may
			// appear.
			// eslint-disable-next-line no-await-in-loop
			await expect(page.locator('.alert-not-found')).toBeVisible();
			// eslint-disable-next-line no-await-in-loop
			await expect(
				page.getByText("Uh-oh! We couldn't find the given alert rule."),
			).toBeVisible();
			// eslint-disable-next-line no-await-in-loop
			await expect(page.getByTestId('alert-details-root')).toBeHidden();
			// eslint-disable-next-line no-await-in-loop
			await expect(page.locator('.edit-rules-container--error')).toBeHidden();
		}
	});

	test('TC-02 /alerts/edit with no ruleId also lands on AlertNotFound', async ({
		authedPage: page,
	}) => {
		await page.goto(ALERT_EDIT_PATH);

		// The alias redirect fires first, so `pages/EditRules`'s missing-id branch — an
		// error notification plus a navigation to `/alerts` — never runs.
		await page.waitForURL(/\/alerts\/overview/);
		await expect(page.locator('.alert-not-found')).toBeVisible();
		await expect(page.getByText('Rule Id is required')).toBeHidden();
	});
});
