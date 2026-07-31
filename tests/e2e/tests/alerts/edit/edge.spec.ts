import { expect, test } from '../../../fixtures/alert-rules';
import { ALERT_EDIT_PATH } from '../../../helpers/alert-forms';
import { ALERT_OVERVIEW_PATH } from '../../../helpers/alerts';

// CE-03 — what the edit routes do with an unknown ruleId.
//
// CE-01 and CE-02 were planned for this file and are **not written**: both aimed
// at error branches inside `pages/EditRules` that cannot be reached. `/alerts/edit`
// is a legacy alias redirected to `/alerts/overview` before any route matches
// (`AppRoutes/Private.tsx:86-107`), and the details shell validates the id before
// rendering the Overview tab, so neither the "Rule Id is required" notification
// nor the `edit-rules-container--error` card can ever render. Coverage doc §9.1
// records them as dead code; this file asserts the behaviour that replaces them.

const UNKNOWN_RULE_ID = '999999999';

test.describe('Alert edit — routing edges', () => {
	test('CE-03 an unknown ruleId shows AlertNotFound on both entry URLs', async ({
		authedPage: page,
	}) => {
		for (const entry of [
			`${ALERT_OVERVIEW_PATH}?ruleId=${UNKNOWN_RULE_ID}`,
			`${ALERT_EDIT_PATH}?ruleId=${UNKNOWN_RULE_ID}`,
		]) {
			// eslint-disable-next-line no-await-in-loop
			await page.goto(entry);

			// `AlertDetails.tsx:70-72` returns AlertNotFound before the provider or the
			// editor mount, so neither the details root nor the standalone route's error
			// card may appear — the latter being the assertion that keeps CE-02's dead
			// branch documented rather than merely deleted.
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

	test('CE-03b /alerts/edit with no ruleId also lands on AlertNotFound', async ({
		authedPage: page,
	}) => {
		await page.goto(ALERT_EDIT_PATH);

		// The alias redirect fires first, so `pages/EditRules`'s missing-id branch —
		// an error notification plus a navigation to `/alerts` — never runs. What a
		// user actually sees is the details shell's not-found state on
		// `/alerts/overview` with no id at all.
		await page.waitForURL(/\/alerts\/overview/);
		await expect(page.locator('.alert-not-found')).toBeVisible();
		await expect(page.getByText('Rule Id is required')).toBeHidden();
	});
});
