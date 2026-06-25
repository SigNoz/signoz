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

export const matchesAnyPattern = (
	candidate: string,
	patterns: string[],
): string | null => {
	const lowered = candidate.toLowerCase();
	const match = patterns.find((pattern) =>
		lowered.startsWith(pattern.toLowerCase()),
	);
	return match || null;
};

const EXAMPLE_INPUT_TOKENS = 2000;
const EXAMPLE_OUTPUT_TOKENS = 500;
const EXAMPLE_CACHE_TOKENS = 1000;
const PER_MILLION = 1_000_000;

export interface CostPreviewParts {
	total: number;
	breakdown: { label: string; cost: number }[];
}

export const computeCostPreview = (draft: DrawerDraft): CostPreviewParts => {
	const breakdown: { label: string; cost: number }[] = [];
	const inputCost = (EXAMPLE_INPUT_TOKENS / PER_MILLION) * draft.pricing.input;
	const outputCost =
		(EXAMPLE_OUTPUT_TOKENS / PER_MILLION) * draft.pricing.output;
	breakdown.push({ label: `${EXAMPLE_INPUT_TOKENS} input`, cost: inputCost });
	breakdown.push({ label: `${EXAMPLE_OUTPUT_TOKENS} output`, cost: outputCost });
	let total = inputCost + outputCost;
	if (hasCacheValue(draft.pricing.cacheRead)) {
		const cost =
			(EXAMPLE_CACHE_TOKENS / PER_MILLION) * (draft.pricing.cacheRead as number);
		breakdown.push({ label: `${EXAMPLE_CACHE_TOKENS} cache_read`, cost });
		total += cost;
	}
	if (hasCacheValue(draft.pricing.cacheWrite)) {
		const cost =
			(EXAMPLE_CACHE_TOKENS / PER_MILLION) * (draft.pricing.cacheWrite as number);
		breakdown.push({ label: `${EXAMPLE_CACHE_TOKENS} cache_write`, cost });
		total += cost;
	}
	return { total, breakdown };
};
