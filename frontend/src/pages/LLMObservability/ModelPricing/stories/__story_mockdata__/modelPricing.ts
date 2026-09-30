/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	ListLLMPricingRules200,
	ListUnmappedLLMModels200,
	LlmpricingruletypesLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO,
} from 'api/generated/services/sigNoz.schemas';

const ORG_ID = 'org-signoz';

interface ModelSeed {
	provider: string;
	modelName: string;
	input: number;
	output: number;
}

/** Prices are dollars per million tokens, which is the only unit the rules have. */
const CATALOGUE: ModelSeed[] = [
	{ provider: 'openai', modelName: 'gpt-4o', input: 2.5, output: 10 },
	{ provider: 'openai', modelName: 'gpt-4o-mini', input: 0.15, output: 0.6 },
	{ provider: 'openai', modelName: 'o3', input: 2, output: 8 },
	{ provider: 'anthropic', modelName: 'claude-sonnet-4', input: 3, output: 15 },
	{ provider: 'anthropic', modelName: 'claude-haiku-4', input: 0.8, output: 4 },
	{ provider: 'google', modelName: 'gemini-2.5-pro', input: 1.25, output: 10 },
	{ provider: 'google', modelName: 'gemini-2.5-flash', input: 0.3, output: 2.5 },
	{ provider: 'meta', modelName: 'llama-3.1-70b', input: 0.6, output: 0.6 },
	{ provider: 'mistral', modelName: 'mistral-large', input: 2, output: 6 },
	{ provider: 'cohere', modelName: 'command-r-plus', input: 2.5, output: 10 },
];

export const PRICING_RULE_MAX = CATALOGUE.length;

/**
 * A rule the org wrote itself is an override; the rest are the catalogue SigNoz
 * ships and syncs, which is what the source filter splits the table by.
 */
const isOverride = (index: number): boolean => index % 4 === 0;

const rule = (
	seed: ModelSeed,
	index: number,
): LlmpricingruletypesLLMPricingRuleDTO => ({
	id: `rule-${seed.modelName}`,
	orgId: ORG_ID,
	enabled: true,
	isOverride: isOverride(index),
	modelName: seed.modelName,
	modelPattern: [`${seed.modelName}*`],
	provider: seed.provider,
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO.per_million_tokens,
	pricing: {
		input: seed.input,
		output: seed.output,
		cache: {
			mode: LlmpricingruletypesLLMPricingRuleCacheModeDTO.subtract,
			read: seed.input / 10,
			write: seed.input * 1.25,
		},
	},
	sourceId: isOverride(index) ? undefined : 'signoz-catalogue',
	syncedAt: isOverride(index) ? null : '2026-08-01T00:00:00Z',
	createdAt: '2026-07-04T09:15:00Z',
	createdBy: 'anna@signoz.io',
	updatedAt: '2026-08-01T00:00:00Z',
	updatedBy: 'anna@signoz.io',
});

export interface PricingRulesQuery {
	offset: number;
	limit: number;
	overridesOnly?: boolean;
}

export const pricingRulesResponse = (
	count: number,
	{ offset, limit, overridesOnly }: PricingRulesQuery,
): ListLLMPricingRules200 => {
	const rules = CATALOGUE.slice(0, count)
		.map(rule)
		.filter((candidate) => !overridesOnly || candidate.isOverride);

	return {
		status: 'success',
		data: {
			items: rules.slice(offset, offset + limit),
			total: rules.length,
			offset,
			limit,
		},
	};
};

const UNPRICED = [
	{ modelName: 'gpt-5-preview', provider: 'openai', spanCount: 18_420 },
	{ modelName: 'claude-opus-5', provider: 'anthropic', spanCount: 6_310 },
	{ modelName: 'deepseek-r2', provider: 'deepseek', spanCount: 940 },
];

export const UNPRICED_MODEL_MAX = UNPRICED.length;

/** Models seen in the last hour of traces that no rule's pattern matches. */
export const unmappedModelsResponse = (
	count: number,
): ListUnmappedLLMModels200 => ({
	status: 'success',
	data: { items: UNPRICED.slice(0, count) },
});
