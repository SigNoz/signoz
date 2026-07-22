import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type ListLLMPricingRules200,
	type ListUnmappedLLMModels200,
} from 'api/generated/services/sigNoz.schemas';

import type { PricingRule, UnpricedModel } from '../types';

// Endpoint glob used by MSW handlers. The generated client hits a relative
// `/api/v1/llm_pricing_rules`, so the `*` prefix matches regardless of base URL.
export const LLM_PRICING_ENDPOINT = '*/api/v1/llm_pricing_rules';
export const LLM_PRICING_RULE_ENDPOINT = '*/api/v1/llm_pricing_rules/:id';
// Distinct path (extra segment), so it needs its own handler — the list glob
// above does not match it.
export const LLM_UNMAPPED_ENDPOINT =
	'*/api/v1/llm_pricing_rules/unmapped_models';

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

// Unpriced models seen in traces with no matching pricing rule.
export const mockUnpricedModels: UnpricedModel[] = [
	{ modelName: 'gpt-4o-mini-2024-07-18', provider: 'openai', spanCount: 18400 },
	{
		modelName: 'claude-3-7-sonnet-20250219',
		provider: 'anthropic',
		spanCount: 9200,
	},
];

// Wraps unpriced models in the envelope the unmapped-models query reads.
export function makeUnmappedResponse(
	items: UnpricedModel[] = mockUnpricedModels,
): ListUnmappedLLMModels200 {
	return {
		status: 'success',
		data: { items },
	};
}

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
