import { expect, test } from '../../fixtures/auth';
import {
	authToken,
	deletePricingRuleViaApi,
	gotoLlmPricingPage,
} from '../../helpers/llm-pricing';

test.describe.configure({ mode: 'serial' });

test.describe('LLM Pricing — Add drawer', () => {
	test('TC-06 opening the drawer shows correct default state', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();

		// Drawer must be visible before asserting field values
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await expect(page.getByTestId('drawer-model-id-input')).toBeVisible();
		// Model ID field is empty by default
		await expect(page.getByTestId('drawer-model-id-input')).toHaveValue('');

		// Provider defaults to OpenAI
		await expect(page.getByTestId('drawer-provider-select')).toContainText('OpenAI');

		// Source radio: Override is checked, Auto is unchecked
		await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
			'data-state',
			'checked',
		);
		await expect(page.getByTestId('drawer-source-auto')).toHaveAttribute(
			'data-state',
			'unchecked',
		);

		// Pricing defaults to 0 (Ant InputNumber wraps a real <input>)
		await expect(
			page.locator('[data-testid="drawer-input-cost"] input'),
		).toHaveValue('0');
		await expect(
			page.locator('[data-testid="drawer-output-cost"] input'),
		).toHaveValue('0');

		// Cache mode is hidden when no cache bucket value
		await expect(page.getByTestId('drawer-cache-mode')).not.toBeVisible();

		// Save is disabled (empty model name); Delete is absent in add mode
		await expect(page.getByTestId('drawer-save-btn')).toBeDisabled();
		await expect(page.getByTestId('drawer-cancel-btn')).toBeVisible();
		await expect(page.getByTestId('drawer-delete-btn')).not.toBeVisible();

		await page.getByTestId('drawer-cancel-btn').click();
		await expect(page.getByText('Add model cost').first()).not.toBeVisible();
	});

	test('TC-07 Save button tooltip shows validation message when model name is empty', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		// Save is disabled; hover triggers tooltip
		const saveBtn = page.getByTestId('drawer-save-btn');
		await expect(saveBtn).toBeDisabled();
		await saveBtn.hover();
		await expect(page.getByText('Billing model ID is required.')).toBeVisible();

		await page.getByTestId('drawer-cancel-btn').click();
	});

	test('TC-08 adding a pattern chip via Add button and Enter key', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.getByTestId('drawer-model-id-input').fill('e2e-add-test');

		// Add via button
		await page.getByTestId('drawer-pattern-input').fill('e2e-add');
		await page.getByTestId('drawer-pattern-add-btn').click();
		await expect(page.getByText('e2e-add*')).toBeVisible();
		await expect(page.getByTestId('drawer-pattern-input')).toHaveValue('');

		// Add via Enter key
		await page.getByTestId('drawer-pattern-input').fill('e2e-add-v2');
		await page.getByTestId('drawer-pattern-input').press('Enter');
		await expect(page.getByText('e2e-add-v2*')).toBeVisible();

		// Deduplication: adding e2e-add again produces no second chip
		await page.getByTestId('drawer-pattern-input').fill('e2e-add');
		await page.getByTestId('drawer-pattern-add-btn').click();
		const chips = page.locator('.pattern-chip');
		await expect(chips).toHaveCount(2);

		// Remove first chip
		await page.getByRole('button', { name: 'Remove pattern e2e-add' }).click();
		await expect(page.getByText('e2e-add*')).not.toBeVisible();
		await expect(page.getByText('e2e-add-v2*')).toBeVisible();

		await page.getByTestId('drawer-cancel-btn').click();
	});

	test('TC-09 save a new user-override rule end-to-end', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.getByTestId('drawer-model-id-input').fill('e2e-save-model');

		// Select Anthropic provider
		await page.getByTestId('drawer-provider-select').click();
		await page.getByText('Anthropic').click();

		// Add pattern
		await page.getByTestId('drawer-pattern-input').fill('e2e-save');
		await page.getByTestId('drawer-pattern-add-btn').click();

		// Override radio is the default
		await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
			'data-state',
			'checked',
		);

		// Set pricing
		await page.locator('[data-testid="drawer-input-cost"] input').fill('5.50');
		await page.locator('[data-testid="drawer-output-cost"] input').fill('17.00');

		// Wait for PUT before clicking Save to avoid a race
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

		// Drawer closes
		await expect(page.getByText('Add model cost').first()).not.toBeVisible();

		// Row appears in table — locate by model name text since we don't know the id yet
		await expect(page.getByText('e2e-save-model')).toBeVisible();
		// Source badge says "User override"
		await expect(page.getByText('User override').first()).toBeVisible();

		// Cleanup: resolve the rule id and delete via API (deletePricingRuleViaApi swallows errors)
		const token = await authToken(page);
		const getRes = await page.request.get(
			'/api/v1/llm_pricing_rules?offset=0&limit=200',
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		const body = (await getRes.json()) as {
			data: { items: Array<{ id: string; modelName: string }> };
		};
		const createdId = body.data.items.find((r) => r.modelName === 'e2e-save-model')?.id ?? '';
		await deletePricingRuleViaApi(page.request, createdId, token);
	});

	test('TC-10 cache-mode select appears only when cache bucket has a value', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.getByTestId('drawer-model-id-input').fill('e2e-cache-test');

		// Cache mode is hidden before any cache bucket value is set
		await expect(page.getByTestId('drawer-cache-mode')).not.toBeVisible();

		// Set cache_read → cache-mode select must appear
		await page.locator('[data-testid="drawer-cache-read-cost"] input').fill('0.30');
		await page.locator('[data-testid="drawer-cache-read-cost"] input').press('Tab');
		await expect(page.getByTestId('drawer-cache-mode')).toBeVisible();

		// Cache mode defaults to "Unknown"
		await expect(page.getByTestId('drawer-cache-mode')).toContainText('Unknown');

		// Change to Subtract
		await page.getByTestId('drawer-cache-mode').click();
		await page.getByText('Subtract (OpenAI style)').click();
		await expect(page.getByTestId('drawer-cache-mode')).toContainText('Subtract');

		// Clearing cache_read hides the select again (Ant InputNumber: Ctrl+A then Delete)
		const cacheInput = page.locator('[data-testid="drawer-cache-read-cost"] input');
		await cacheInput.click();
		await cacheInput.press('Control+a');
		await cacheInput.press('Delete');
		// Ant InputNumber fires onChange with null on clear — click elsewhere to commit
		await page.locator('[data-testid="drawer-output-cost"] input').click();
		await expect(page.getByTestId('drawer-cache-mode')).not.toBeVisible();

		await page.getByTestId('drawer-cancel-btn').click();
	});

	test('TC-11 cancel closes the drawer without persisting data', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		await page.getByTestId('drawer-model-id-input').fill('e2e-cancel-test');
		await page.locator('[data-testid="drawer-input-cost"] input').fill('99');

		await page.getByTestId('drawer-cancel-btn').click();
		await expect(page.getByText('Add model cost').first()).not.toBeVisible();

		// No row created
		await expect(page.getByText('e2e-cancel-test')).not.toBeVisible();

		// Re-opening resets all fields to defaults
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();
		await expect(page.getByTestId('drawer-model-id-input')).toHaveValue('');
		await expect(
			page.locator('[data-testid="drawer-input-cost"] input'),
		).toHaveValue('0');

		await page.getByTestId('drawer-cancel-btn').click();
	});
});
