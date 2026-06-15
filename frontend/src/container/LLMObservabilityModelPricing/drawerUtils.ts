import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type LlmpricingruletypesLLMPricingCacheCostsDTO,
	type LlmpricingruletypesLLMRulePricingDTO,
	type LlmpricingruletypesUpdatableLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { PricingRule } from './utils';

export const PROVIDER_OPTIONS = [
	{ value: 'OpenAI', label: 'OpenAI' },
	{ value: 'Anthropic', label: 'Anthropic' },
	{ value: 'Azure OpenAI', label: 'Azure OpenAI' },
	{ value: 'Google', label: 'Google' },
	{ value: 'Self-hosted', label: 'Self-hosted' },
	{ value: 'Other', label: 'Other' },
];

export const CACHE_MODE_OPTIONS = [
	{
		value: CacheModeDTO.subtract,
		label: 'Subtract (OpenAI style)',
	},
	{
		value: CacheModeDTO.additive,
		label: 'Additive (Anthropic style)',
	},
	{
		value: CacheModeDTO.unknown,
		label: 'Unknown',
	},
];

export type DrawerMode = 'add' | 'edit';

export interface DrawerDraft {
	id: string | null;
	sourceId: string | null;
	modelName: string;
	provider: string;
	patterns: string[];
	isOverride: boolean;
	pricing: {
		input: number;
		output: number;
		cacheMode: CacheModeDTO;
		cacheRead: number | null;
		cacheWrite: number | null;
	};
}

export const EMPTY_DRAFT: DrawerDraft = {
	id: null,
	sourceId: null,
	modelName: '',
	provider: 'OpenAI',
	patterns: [],
	isOverride: true,
	pricing: {
		input: 0,
		output: 0,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
	},
};

export const draftFromRule = (rule: PricingRule): DrawerDraft => ({
	id: rule.id,
	sourceId: rule.sourceId ?? null,
	modelName: rule.modelName,
	provider: rule.provider || 'OpenAI',
	patterns: rule.modelPattern || [],
	isOverride: !!rule.isOverride,
	pricing: {
		input: rule.pricing?.input ?? 0,
		output: rule.pricing?.output ?? 0,
		cacheMode: rule.pricing?.cache?.mode ?? CacheModeDTO.unknown,
		cacheRead: rule.pricing?.cache?.read ?? null,
		cacheWrite: rule.pricing?.cache?.write ?? null,
	},
});

const hasCacheValue = (value: number | null): boolean =>
	typeof value === 'number' && value > 0;

export const buildPricingPayload = (
	draft: DrawerDraft,
): LlmpricingruletypesLLMRulePricingDTO => {
	const pricing: LlmpricingruletypesLLMRulePricingDTO = {
		input: draft.pricing.input,
		output: draft.pricing.output,
	};
	if (
		hasCacheValue(draft.pricing.cacheRead) ||
		hasCacheValue(draft.pricing.cacheWrite)
	) {
		const cache: LlmpricingruletypesLLMPricingCacheCostsDTO = {
			mode: draft.pricing.cacheMode,
		};
		if (hasCacheValue(draft.pricing.cacheRead)) {
			cache.read = draft.pricing.cacheRead as number;
		}
		if (hasCacheValue(draft.pricing.cacheWrite)) {
			cache.write = draft.pricing.cacheWrite as number;
		}
		pricing.cache = cache;
	}
	return pricing;
};

export const buildRulePayload = (
	draft: DrawerDraft,
): LlmpricingruletypesUpdatableLLMPricingRuleDTO => ({
	id: draft.id || undefined,
	sourceId: draft.sourceId || undefined,
	modelName: draft.modelName.trim(),
	provider: draft.provider.trim(),
	modelPattern:
		draft.patterns.length > 0 ? draft.patterns : [draft.modelName.trim()],
	isOverride: draft.isOverride,
	enabled: true,
	unit: UnitDTO.per_million_tokens,
	pricing: buildPricingPayload(draft),
});

export interface ValidationResult {
	ok: boolean;
	message?: string;
}

export const validateDraft = (
	draft: DrawerDraft,
	mode: DrawerMode,
): ValidationResult => {
	if (mode === 'add' && !draft.modelName.trim()) {
		return { ok: false, message: 'Billing model ID is required.' };
	}
	if (!draft.provider.trim()) {
		return { ok: false, message: 'Provider is required.' };
	}
	if (draft.pricing.input < 0 || draft.pricing.output < 0) {
		return { ok: false, message: 'Pricing values must be non-negative.' };
	}
	return { ok: true };
};
