import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/common';
import {
	deletePricingRulesByModelName,
	gotoLlmPricing,
} from '../../helpers/llm-pricing';

// One basic-flow test that mutates backend state — run serially. Add/save
// controls only render for a user with `manage_llm_pricing` (admin); the
// pytest-bootstrap user is an admin.
test.describe.configure({ mode: 'serial' });

// Unique model name so the flow is isolated and cleanup can target it.
const MODEL_NAME = 'e2e-pricing-happy-model';
const INPUT_COST = '5.50';
const OUTPUT_COST = '17.00';

test.afterAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		await deletePricingRulesByModelName(ctx.request, token, [MODEL_NAME]);
	} finally {
		await ctx.close();
	}
});

test.describe('LLM Observability — Model Pricing', () => {
	test('basic flow: add a user-override model cost and save it to the backend', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricing(page);

		// ── Open the add drawer ──────────────────────────────────────────────
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByTestId('drawer-model-id-input')).toBeVisible();

		// ── Set the three required fields. Provider defaults to OpenAI and the
		//    source defaults to "User override", so the pricing inputs are
		//    editable (filling them succeeds only in override mode). ──────────
		await page.getByTestId('drawer-model-id-input').fill(MODEL_NAME);
		await page.getByTestId('drawer-input-cost').fill(INPUT_COST);
		await page.getByTestId('drawer-output-cost').fill(OUTPUT_COST);

		// ── Save: send to the backend via PUT /api/v1/llm_pricing_rules ──────
		const putResponse = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/llm_pricing_rules') &&
				r.request().method() === 'PUT',
		);

		const saveBtn = page.getByTestId('drawer-save-btn');
		await expect(saveBtn).toBeEnabled();
		await saveBtn.click();
		expect((await putResponse).ok()).toBeTruthy();

		// Drawer closes and the invalidation-driven refetch surfaces the new row.
		await expect(page.getByTestId('drawer-model-id-input')).toHaveCount(0);
		await expect(page.getByTestId('model-costs-table')).toBeVisible();
		await expect(
			page
				.locator('[data-testid^="model-cell-name-"]')
				.filter({ hasText: MODEL_NAME }),
		).toBeVisible();
	});
});
