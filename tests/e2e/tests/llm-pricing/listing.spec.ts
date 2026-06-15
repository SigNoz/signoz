import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	authToken,
	createPricingRuleViaApi,
	deletePricingRuleViaApi,
	gotoLlmPricingPage,
	LLM_PRICING_PATH,
} from '../../helpers/llm-pricing';

// Tests mutate the pricing rule list — run serially within the worker.
test.describe.configure({ mode: 'serial' });

// ─── Suite-level seed registry ────────────────────────────────────────────────
//
// TC-01 through TC-04 share two seeded rules (ruleA and ruleB) seeded in
// beforeAll. TC-05 runs against an empty workspace and must not seed.

const seedIds = new Set<string>();
let ruleAId = '';
let ruleBId = '';

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		ruleAId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-gpt-4o',
			provider: 'OpenAI',
			isOverride: false,
			inputCost: 5.0,
			outputCost: 15.0,
		});
		seedIds.add(ruleAId);

		ruleBId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-claude-3',
			provider: 'Anthropic',
			isOverride: true,
			inputCost: 8.0,
			outputCost: 24.0,
		});
		seedIds.add(ruleBId);
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) return;
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deletePricingRuleViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('LLM Pricing — Listing', () => {
	test('TC-01 listing page renders with data', async ({ authedPage: page }) => {
		await gotoLlmPricingPage(page);

		await expect(page.getByTestId('llm-observability-model-pricing-page')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Configuration', level: 1 })).toBeVisible();

		// Tabs
		const modelCostsTab = page.getByRole('tab', { name: 'Model costs' });
		await expect(modelCostsTab).toBeVisible();
		await expect(modelCostsTab).toHaveAttribute('aria-selected', 'true');

		const unpricedTab = page.getByRole('tab', { name: 'Unpriced models' });
		await expect(unpricedTab).toBeVisible();
		await expect(unpricedTab).toHaveAttribute('aria-disabled', 'true');

		// Filter bar
		await expect(page.getByTestId('search-input')).toBeVisible();
		await expect(page.getByTestId('source-select')).toBeVisible();
		await expect(page.getByTestId('add-model-cost-btn')).toBeVisible();

		// Table and rows
		await expect(page.getByTestId('model-costs-table')).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toBeVisible();

		// Footer
		await expect(page.getByText(/Showing 2 models/)).toBeVisible();
	});

	test('TC-02 table columns and source badge render correctly', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);

		// Rule A — auto (isOverride: false)
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toHaveText('e2e-gpt-4o');
		await expect(page.getByTestId(`model-cell-canonical-id-${ruleAId}`)).toHaveText(
			'openai:e2e-gpt-4o',
		);
		const badgeA = page.getByTestId(`source-badge-${ruleAId}`);
		await expect(badgeA).toHaveText('Auto');

		// Rule B — user override (isOverride: true)
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toHaveText('e2e-claude-3');
		const badgeB = page.getByTestId(`source-badge-${ruleBId}`);
		await expect(badgeB).toHaveText('User override');

		// Price cells show $ prefix
		await expect(page.getByTestId(`price-cell-input-${ruleAId}`)).toHaveText('$5.00');
		await expect(page.getByTestId(`price-cell-output-${ruleAId}`)).toHaveText('$15.00');

		// Edit button present for each row
		await expect(page.getByTestId(`edit-rule-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`edit-rule-${ruleBId}`)).toBeVisible();
	});

	test('TC-03 search filters rows by model name and provider', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);

		// Search by model name prefix
		await page.getByTestId('search-input').fill('e2e-gpt');
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).not.toBeVisible();
		await expect(page.getByText(/Showing 1 model[^s]/)).toBeVisible();

		// Search by provider (case-insensitive)
		await page.getByTestId('search-input').fill('anthropic');
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).not.toBeVisible();
		await expect(page.getByText(/Showing 1 model[^s]/)).toBeVisible();

		// Clear search restores both rows
		await page.getByTestId('search-input').fill('');
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toBeVisible();
		await expect(page.getByText(/Showing 2 models/)).toBeVisible();
	});

	test('TC-04 source filter narrows the table to auto-only or override-only', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);

		// Filter to auto-populated only
		await page.getByTestId('source-select').click();
		await page.getByText('Auto-populated').click();
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).not.toBeVisible();
		await expect(page.getByText(/Showing 1 model[^s]/)).toBeVisible();

		// Filter to user override only
		await page.getByTestId('source-select').click();
		await page.getByText('User override').click();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).not.toBeVisible();
		await expect(page.getByText(/Showing 1 model[^s]/)).toBeVisible();

		// Reset to all
		await page.getByTestId('source-select').click();
		await page.getByText('Source: All').click();
		await expect(page.getByTestId(`model-cell-name-${ruleAId}`)).toBeVisible();
		await expect(page.getByTestId(`model-cell-name-${ruleBId}`)).toBeVisible();
	});
});

// TC-05 is isolated — no seeded data; runs in a standalone describe so it
// does not inherit the shared beforeAll seed.
test.describe('LLM Pricing — Empty state', () => {
	test('TC-05 empty state — zero rules returns empty table', async ({
		authedPage: page,
	}) => {
		// Wait for the list request to complete before asserting the empty state
		// so the test does not race against the initial fetch.
		const listResponse = page.waitForResponse(
			(r) =>
				r.url().includes('llm_pricing_rules') && r.request().method() === 'GET',
		);
		await page.goto(LLM_PRICING_PATH);
		await page.getByTestId('llm-observability-model-pricing-page').waitFor({ state: 'visible' });
		await listResponse;

		await expect(page.getByTestId('model-costs-table')).toBeVisible();
		// No data rows — Ant Table renders its empty placeholder
		await expect(page.getByText(/Showing 0 models/)).toBeVisible();
	});
});
