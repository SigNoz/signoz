import { expect, test } from '../../fixtures/auth';
import {
	authToken,
	createPricingRuleViaApi,
	deletePricingRuleViaApi,
	gotoLlmPricingPage,
} from '../../helpers/llm-pricing';

test.describe.configure({ mode: 'serial' });

// Helper — executes in the browser context (Playwright evaluate). TypeScript
// cannot see browser globals from Node, so we use `any` to avoid DOM-lib deps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBorderColor = (el: any): string =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).getComputedStyle(el).borderColor;

test.describe('LLM Pricing — Source radio behaviour', () => {
	test('TC-15 Override → Auto triggers reset-confirm; Keep cancels it', async ({
		authedPage: page,
	}) => {
		// Auto-populated is disabled in Add mode, so the Override→Auto switch is
		// only reachable when editing an existing override rule.
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-src-switch',
			provider: 'OpenAI',
			isOverride: true,
			inputCost: 25,
			outputCost: 75,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Confirm starting state: Override checked
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'checked',
			);

			// Click Auto — should trigger the reset-confirm dialog
			await page.getByTestId('drawer-source-auto').click();

			const resetDialog = page.locator(
				'[role="dialog"][aria-label="Reset to default pricing"]',
			);
			await expect(resetDialog).toBeVisible();
			await expect(page.getByTestId('drawer-reset-keep-btn')).toBeVisible();
			await expect(page.getByTestId('drawer-reset-confirm-btn')).toBeVisible();

			// While confirm is showing, the switch has NOT been applied yet
			await expect(page.getByTestId('drawer-source-auto')).toHaveAttribute(
				'data-state',
				'unchecked',
			);
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'checked',
			);

			// Click Keep — dialog dismisses without changing the radio
			await page.getByTestId('drawer-reset-keep-btn').click();
			await expect(resetDialog).not.toBeVisible();
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'checked',
			);
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toHaveValue('25');
			await expect(
				page.locator('[data-testid="drawer-output-cost"] input'),
			).toHaveValue('75');
		} finally {
			await page
				.getByTestId('drawer-cancel-btn')
				.click()
				.catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-16 Override → Auto then Reset clears values and switches to auto mode', async ({
		authedPage: page,
	}) => {
		// Reachable only in Edit mode (Auto is disabled when adding a new model).
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-src-reset',
			provider: 'OpenAI',
			isOverride: true,
			inputCost: 25,
			outputCost: 75,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			await page.getByTestId('drawer-source-auto').click();
			const resetDialog = page.locator(
				'[role="dialog"][aria-label="Reset to default pricing"]',
			);
			await expect(resetDialog).toBeVisible();

			await page.getByTestId('drawer-reset-confirm-btn').click();
			await expect(resetDialog).not.toBeVisible();

			// Radio has switched to Auto
			await expect(page.getByTestId('drawer-source-auto')).toHaveAttribute(
				'data-state',
				'checked',
			);
			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'unchecked',
			);

			// Pricing inputs are now read-only
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toBeDisabled();
			await expect(
				page.locator('[data-testid="drawer-output-cost"] input'),
			).toBeDisabled();
		} finally {
			await page
				.getByTestId('drawer-cancel-btn')
				.click()
				.catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-17 Auto → Override switching works without confirm', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-auto-switch',
			provider: 'OpenAI',
			isOverride: false,
			inputCost: 1.0,
			outputCost: 4.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			await expect(page.getByTestId('drawer-source-auto')).toHaveAttribute(
				'data-state',
				'checked',
			);
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toBeDisabled();

			// Click Override — no reset-confirm should appear
			await page.getByTestId('drawer-source-override').click();
			await expect(
				page.locator('[role="dialog"][aria-label="Reset to default pricing"]'),
			).not.toBeVisible();

			await expect(page.getByTestId('drawer-source-override')).toHaveAttribute(
				'data-state',
				'checked',
			);
			await expect(
				page.locator('[data-testid="drawer-input-cost"] input'),
			).toBeEnabled();
		} finally {
			await page
				.getByTestId('drawer-cancel-btn')
				.click()
				.catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-18 source radio card highlight — checked state gets tinted border', async ({
		authedPage: page,
	}) => {
		const ruleId = await createPricingRuleViaApi(page, {
			modelName: 'e2e-border-check',
			provider: 'OpenAI',
			isOverride: true,
			inputCost: 1.0,
			outputCost: 4.0,
		});
		try {
			await gotoLlmPricingPage(page);
			await page.getByTestId(`edit-rule-${ruleId}`).click();
			await expect(page.getByText('Edit model cost').first()).toBeVisible();

			// Override card is checked — its border-color must be non-transparent
			const overrideCard = page.locator('.source-radio--override');
			await expect(
				overrideCard.locator('button[data-state="checked"]'),
			).toBeVisible();
			const overrideBorder = await overrideCard.evaluate(getBorderColor);
			expect(overrideBorder).not.toBe('transparent');
			expect(overrideBorder).not.toBe('rgba(0, 0, 0, 0)');

			// Auto card is unchecked — its border-color should be transparent
			const autoCard = page.locator('.source-radio--auto');
			await expect(
				autoCard.locator('button[data-state="unchecked"]'),
			).toBeVisible();
			const autoBorder = await autoCard.evaluate(getBorderColor);
			expect(autoBorder).toBe('rgba(0, 0, 0, 0)');

			// Switch to Auto and confirm reset
			await page.getByTestId('drawer-source-auto').click();
			const resetDialog = page.locator(
				'[role="dialog"][aria-label="Reset to default pricing"]',
			);
			await expect(resetDialog).toBeVisible();
			await page.getByTestId('drawer-reset-confirm-btn').click();
			await expect(resetDialog).not.toBeVisible();

			// Now Auto card has the tinted border; Override card is transparent
			const autoBorderAfter = await autoCard.evaluate(getBorderColor);
			expect(autoBorderAfter).not.toBe('transparent');
			expect(autoBorderAfter).not.toBe('rgba(0, 0, 0, 0)');

			const overrideBorderAfter = await overrideCard.evaluate(getBorderColor);
			expect(overrideBorderAfter).toBe('rgba(0, 0, 0, 0)');
		} finally {
			await page
				.getByTestId('drawer-cancel-btn')
				.click()
				.catch(() => undefined);
			const token = await authToken(page);
			await deletePricingRuleViaApi(page.request, ruleId, token);
		}
	});

	test('TC-19 unchecked radio dot is visible — border not invisible against drawer surface', async ({
		authedPage: page,
	}) => {
		await gotoLlmPricingPage(page);
		await page.getByTestId('add-model-cost-btn').click();
		await expect(page.getByText('Add model cost').first()).toBeVisible();

		// In add mode, Override is checked and Auto is unchecked
		const autoBtn = page.getByTestId('drawer-source-auto');
		await expect(autoBtn).toHaveAttribute('data-state', 'unchecked');

		// The CSS fix sets --radio-group-item-border-color: var(--bg-slate-200)
		// on .source-radio-group; assert the computed border is not invisible.
		const borderColor = await autoBtn.evaluate(getBorderColor);
		expect(borderColor).not.toBe('transparent');
		expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');

		// Auto label text is visible alongside the dot
		await expect(page.getByText('Auto-populated').first()).toBeVisible();

		await page.getByTestId('drawer-cancel-btn').click();
	});
});
