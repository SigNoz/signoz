import { expect, test } from '../../fixtures/auth';
import {
	authToken,
	createPricingRuleViaApi,
	deletePricingRuleViaApi,
	gotoLlmPricingPage,
} from '../../helpers/llm-pricing';

test.describe.configure({ mode: 'serial' });

test.describe('LLM Pricing — Edit drawer', () => {
	test('TC-12 Edit button opens drawer pre-filled with rule data', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-edit-subject',
			provider: 'Google',
			isOverride: true,
			inputCost: 3.0,
			outputCost: 12.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();

			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Model ID is locked in edit mode
			const modelInput = page.getByTestId('drawer-model-id-input');
			await expect(modelInput).toBeDisabled();
			await expect(modelInput).toHaveValue('e2e-edit-subject');

			// Provider is locked and pre-filled
			await expect(page.getByTestId('drawer-provider-select')).toBeDisabled();
			await expect(page.getByTestId('drawer-provider-select')).toContainText('Google');

			// Source radio
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'checked',
			);

			// Pricing values
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toHaveValue('3');
			await expect(
				page.locator('[data-testid="drawer-output-cost"] input'),
			).toHaveValue('12');

			// Delete button present in edit mode
			await expect(page.getByTestId('drawer-delete-btn')).toBeVisible();
		} finally {
			await page.getByTestId('drawer-cancel-btn').click().catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-13 editing pricing values and saving updates the row', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-edit-subject',
			provider: 'Google',
			isOverride: true,
			inputCost: 3.0,
			outputCost: 12.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Update pricing
			const inputField = page.locator('[data-testid="drawer-input-cost"] input');
			const outputField = page.locator('[data-testid="drawer-output-cost"] input');

			await inputField.click();
			await inputField.press('Control+a');
			await inputField.fill('7.00');

			await outputField.click();
			await outputField.press('Control+a');
			await outputField.fill('21.00');

			const putResponse = page.waitForResponse(
				(r) =>
					r.url().includes('llm_pricing_rules') && r.request().method() === 'PUT',
			);
			const listRefresh = page.waitForResponse(
				(r) =>
					r.url().includes('llm_pricing_rules') && r.request().method() === 'GET',
			);
			await page.getByTestId('drawer-save-btn').click();
			const put = await putResponse;
			expect(put.status()).toBe(200);
			await listRefresh;

			await expect(page.getByText('Edit model cost').first()).not.toBeVisible();

			// Updated values visible in the row
			await expect(page.getByTestId(`price-cell-input-${ruleId}`)).toHaveText('$7.00');
			await expect(page.getByTestId(`price-cell-output-${ruleId}`)).toHaveText('$21.00');
		} finally {
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-14 read-only mode — auto rule opens with Managed-by-SigNoz and Read-only badges', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-auto-rule',
			provider: 'OpenAI',
			isOverride: false,
			inputCost: 2.0,
			outputCost: 8.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Source section lock badge
			await expect(page.getByTestId('drawer-managed-label')).toBeVisible();
			await expect(page.getByTestId('drawer-managed-label')).toContainText(
				'Managed by SigNoz',
			);

			// Pricing section lock badge
			await expect(page.getByTestId('drawer-readonly-label')).toBeVisible();
			await expect(page.getByTestId('drawer-readonly-label')).toContainText('Read-only');

			// Fields are locked
			await expect(page.getByTestId('drawer-model-id-input')).toBeDisabled();

			// Radio: auto is checked
			await expect(page.getByTestId('drawer-source-auto')).toHaveAttribute(
				'data-state',
				'checked',
			);
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'unchecked',
			);

			// Pricing inputs are disabled
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toBeDisabled();
			await expect(
				page.locator('[data-testid="drawer-output-cost"] input'),
			).toBeDisabled();

			// Pattern input is hidden when read-only
			await expect(page.getByTestId('drawer-pattern-input')).not.toBeVisible();
		} finally {
			await page.getByTestId('drawer-cancel-btn').click().catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});
});
