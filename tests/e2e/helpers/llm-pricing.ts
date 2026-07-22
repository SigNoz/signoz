import type { APIRequestContext, Page } from '@playwright/test';

export const LLM_PRICING_PATH = '/ai-observability/configuration';
export const LLM_PRICING_PAGE_TESTID = 'llm-observability-model-pricing-page';

export async function gotoLlmPricing(page: Page): Promise<void> {
	await page.goto(LLM_PRICING_PATH);
	await page.getByTestId(LLM_PRICING_PAGE_TESTID).waitFor({ state: 'visible' });
}

interface PricingRule {
	id: string;
	modelName: string;
}

/** List pricing rules via API (`GET /api/v1/llm_pricing_rules`). */
export async function listPricingRules(
	request: APIRequestContext,
	token: string,
): Promise<PricingRule[]> {
	const res = await request.get('/api/v1/llm_pricing_rules', {
		params: { offset: 0, limit: 100 },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		return [];
	}
	const body = (await res.json()) as {
		data?: { items?: PricingRule[] | null };
	};
	return body.data?.items ?? [];
}

export async function deletePricingRulesByModelName(
	request: APIRequestContext,
	token: string,
	modelNames: string[],
): Promise<void> {
	const wanted = new Set(modelNames);
	const rules = await listPricingRules(request, token).catch(() => []);
	await Promise.all(
		rules
			.filter((rule) => wanted.has(rule.modelName))
			.map((rule) =>
				request
					.delete(`/api/v1/llm_pricing_rules/${rule.id}`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					.catch(() => undefined),
			),
	);
}
