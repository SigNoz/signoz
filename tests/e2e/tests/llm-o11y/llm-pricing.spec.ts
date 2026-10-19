import {
	expect,
	llmO11yDriver,
	onAdminPage,
	test,
} from '../../drivers/llm-o11y';
test.describe.configure({ mode: 'serial' });

const MODEL_NAME = 'e2e-pricing-happy-model';
const INPUT_COST = '5.50';
const OUTPUT_COST = '17.00';

test.afterAll(async ({ browser }) => {
	await onAdminPage(browser, (page) =>
		llmO11yDriver(page).deletePricingRules([MODEL_NAME]),
	);
});

test.describe('LLM Observability — Model Pricing', () => {
	test('basic flow: add a user-override model cost and save it to the backend', async ({
		authedPage: page,
		llm,
	}) => {
		await llm.gotoPricing();

		await llm.pricing.addModelCost().click();
		await expect(llm.pricing.modelIdInput()).toBeVisible();

		await llm.pricing.modelIdInput().fill(MODEL_NAME);
		await llm.pricing.patternInput().fill(MODEL_NAME);
		await llm.pricing.addPattern().click();
		await llm.pricing.inputCost().fill(INPUT_COST);
		await llm.pricing.outputCost().fill(OUTPUT_COST);

		const putResponse = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/llm_pricing_rules') &&
				r.request().method() === 'PUT',
		);

		const saveBtn = llm.pricing.save();
		await expect(saveBtn).toBeEnabled();
		await saveBtn.click();
		expect((await putResponse).ok()).toBeTruthy();

		await expect(llm.pricing.modelIdInput()).toHaveCount(0);
		await expect(llm.pricing.table()).toBeVisible();
		await expect(llm.pricing.modelName(MODEL_NAME)).toBeVisible();
	});
});
