import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type ListLLMPricingRules200,
} from 'api/generated/services/sigNoz.schemas';

import type { PricingRule } from '../types';

// Endpoint glob used by MSW handlers. The generated client hits a relative
// `/api/v1/llm_pricing_rules`, so the `*` prefix matches regardless of base URL.
export const LLM_PRICING_ENDPOINT = '*/api/v1/llm_pricing_rules';
export const LLM_PRICING_RULE_ENDPOINT = '*/api/v1/llm_pricing_rules/:id';

// Builds a valid pricing rule, with overrides merged shallowly. Pricing is
// replaced wholesale when provided so callers can shape cache buckets freely.
export function makePricingRule(
	overrides: Partial<PricingRule> = {},
): PricingRule {
	const { pricing, ...rest } = overrides;
	return {
		id: 'rule-1',
		enabled: true,
		isOverride: true,
		modelName: 'gpt-4o',
		modelPattern: ['gpt-4o'],
		orgId: 'org-1',
		provider: 'OpenAI',
		sourceId: 'source-1',
		unit: UnitDTO.per_million_tokens,
		createdAt: '2023-10-01T00:00:00.000Z',
		updatedAt: '2023-10-10T00:00:00.000Z',
		syncedAt: '2023-10-10T00:00:00.000Z',
		pricing: {
			input: 3,
			output: 9,
			...pricing,
		},
		...rest,
	};
}

export const mockRules: PricingRule[] = [
	makePricingRule({
		id: 'rule-openai',
		modelName: 'gpt-4o',
		provider: 'OpenAI',
		isOverride: true,
		pricing: { input: 3, output: 9 },
	}),
	makePricingRule({
		id: 'rule-anthropic',
		modelName: 'claude-3-5-sonnet',
		provider: 'Anthropic',
		isOverride: false,
		pricing: {
			input: 2,
			output: 30,
			cache: { mode: CacheModeDTO.additive, read: 3, write: 6 },
		},
	}),
];

// Wraps items in the list response envelope the list query reads
// (`data.data.items` / `data.data.total`).
export function makeListResponse(
	items: PricingRule[],
	total = items.length,
	offset = 0,
	limit = 20,
): ListLLMPricingRules200 {
	return {
		status: 'success',
		data: {
			items,
			total,
			offset,
			limit,
		},
	};
}
