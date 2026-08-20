import { expect, test } from '../../../fixtures/alert-rules';
import { gotoAlertOverview } from '../../../helpers/alerts';

const TARGET = 245;

test.describe('Alert overview — threshold persistence', () => {
	test('TC-01 edit page displays the saved threshold value', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(
			`e2e-threshold-persistence-${Date.now()}`,
			{ target: TARGET },
		);

		await gotoAlertOverview(page, ruleId);

		await expect(page.getByTestId('threshold-value-input')).toHaveValue(
			String(TARGET),
		);
	});
});
