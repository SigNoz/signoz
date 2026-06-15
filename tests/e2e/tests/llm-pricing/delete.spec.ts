import { expect, test } from '../../fixtures/auth';
import {
	authToken,
	createPricingRuleViaApi,
	deletePricingRuleViaApi,
	gotoLlmPricingPage,
} from '../../helpers/llm-pricing';

test.describe.configure({ mode: 'serial' });

test.describe('LLM Pricing — Delete rule', () => {
	test('TC-20 Delete button removes the rule from the list', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-delete-target',
			provider: 'OpenAI',
			isOverride: true,
			inputCost: 5.0,
			outputCost: 15.0,
		});

		await gotoLlmPricingPage(page);
		await page.getByTestId(`edit-rule-${ruleId}`).click();
		await expect(page.getByText('Edit model cost').first()).toBeVisible();

		const deleteResponse = page.waitForResponse(
			(r) =>
				r.url().includes('llm_pricing_rules') && r.request().method() === 'DELETE',
		);
		const listRefresh = page.waitForResponse(
			(r) =>
				r.url().includes('llm_pricing_rules') && r.request().method() === 'GET',
		);
		await page.getByTestId('drawer-delete-btn').click();
		const del = await deleteResponse;
		// DELETE returns 200 or 204
		expect([200, 204]).toContain(del.status());
		await listRefresh;

		await expect(page.getByText('Edit model cost').first()).not.toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleId}`)).not.toBeVisible();

		// Rule was deleted by the UI; best-effort API call swallows any 404
		const token = await authToken(page);
		await deletePricingRuleViaApi(page.request, ruleId, token);
	});

	test('TC-21 delete error is surfaced in the drawer', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-delete-error',
			provider: 'OpenAI',
			isOverride: true,
			inputCost: 3.0,
			outputCost: 9.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Intercept the DELETE and return 500
			await page.route(`**/api/v1/llm_pricing_rules/${ruleId}`, async (route) => {
				if (route.request().method() === 'DELETE') {
					await route.fulfill({ status: 500, body: '{"message":"internal error"}' });
				} else {
					await route.continue();
				}
			});

			await page.getByTestId('drawer-delete-btn').click();

			// Error alert must appear inside the open drawer
			await expect(page.locator('[role="alert"].drawer-error')).toBeVisible();

			// Drawer stays open
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Remove the route intercept so cleanup can proceed
			await page.unrouteAll();
		} finally {
			await page.getByTestId('drawer-cancel-btn').click().catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-22 save error is surfaced in the drawer', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.getByTestId('drawer-model-id-input').fill('e2e-err-test');

		// Intercept PUT and return 422
		await page.route('**/api/v1/llm_pricing_rules', async (route) => {
			if (route.request().method() === 'PUT') {
				await route.fulfill({
					status: 422,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'duplicate key' }),
				});
			} else {
				await route.continue();
			}
		});

		await page.getByTestId('drawer-save-btn').click();

		// Error alert appears inside the drawer
		await expect(page.locator('[role="alert"].drawer-error')).toBeVisible();

		// Drawer remains open
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.unrouteAll();
		await page.getByTestId('drawer-cancel-btn').click();
	});
});
