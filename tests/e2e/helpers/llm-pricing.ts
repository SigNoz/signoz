import type { APIRequestContext, Page } from '@playwright/test';

export const LLM_PRICING_PATH = '/llm-observability/model-pricing';

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Read the JWT the auth fixture stored in `localStorage.AUTH_TOKEN`. The
 * page must be on the SigNoz origin first; if not, this navigates to the
 * pricing page to populate localStorage from the context's storageState.
 */
export async function authToken(page: Page): Promise<string> {
	if (!page.url().startsWith('http')) {
		await page.goto(LLM_PRICING_PATH);
	}
	return page.evaluate(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		() => (globalThis as any).localStorage.getItem('AUTH_TOKEN') || '',
	);
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Navigate to the LLM pricing page and wait for the root container.
 */
export async function gotoLlmPricingPage(page: Page): Promise<void> {
	await page.goto(LLM_PRICING_PATH);
	await page
		.getByTestId('llm-observability-model-pricing-page')
		.waitFor({ state: 'visible' });
}

// ─── API helpers ─────────────────────────────────────────────────────────────

interface SeedOptions {
	modelName?: string;
	provider?: string;
	isOverride?: boolean;
	inputCost?: number;
	outputCost?: number;
}

/**
 * Seed one pricing rule via `PUT /api/v1/llm_pricing_rules` and return its id.
 * The PUT response is void (HTTP 200, no body), so a follow-up GET by modelName
 * is required to obtain the id.
 */
export async function createPricingRuleViaApi(
	page: Page,
	overrides: SeedOptions = {},
): Promise<string> {
	const {
		modelName = 'e2e-test-model',
		provider = 'OpenAI',
		isOverride = true,
		inputCost = 10.0,
		outputCost = 30.0,
	} = overrides;

	const token = await authToken(page);

	const putRes = await page.request.put('/api/v1/llm_pricing_rules', {
		data: {
			rules: [
				{
					modelName,
					provider,
					modelPattern: [modelName],
					isOverride,
					enabled: true,
					unit: 'per_million_tokens',
					pricing: { input: inputCost, output: outputCost },
				},
			],
		},
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!putRes.ok()) {
		throw new Error(
			`PUT /api/v1/llm_pricing_rules ${putRes.status()}: ${await putRes.text()}`,
		);
	}

	// PUT returns void — fetch the list to find the newly-created rule's id.
	const getRes = await page.request.get('/api/v1/llm_pricing_rules?offset=0&limit=200', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!getRes.ok()) {
		throw new Error(
			`GET /api/v1/llm_pricing_rules ${getRes.status()}: ${await getRes.text()}`,
		);
	}
	const body = (await getRes.json()) as {
		data: { items: Array<{ id: string; modelName: string }> };
	};
	const rule = body.data.items.find((r) => r.modelName === modelName);
	if (!rule) {
		throw new Error(`Could not find seeded rule "${modelName}" in GET response`);
	}
	return rule.id;
}

/**
 * Best-effort delete via API. Errors are swallowed so suite-level cleanup
 * stays resilient when a UI flow already deleted the resource (404) or the
 * stack is mid-shutdown.
 */
export async function deletePricingRuleViaApi(
	request: APIRequestContext,
	id: string,
	token: string,
): Promise<void> {
	await request
		.delete(`/api/v1/llm_pricing_rules/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
		.catch(() => undefined);
}
