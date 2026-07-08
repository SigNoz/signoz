import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
	type LlmpricingruletypesLLMPricingCacheCostsDTO,
	type LlmpricingruletypesLLMRulePricingDTO,
	type LlmpricingruletypesUpdatableLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import type {
	DrawerDraft,
	DrawerMode,
	ExtraBucket,
	PricingRule,
} from './types';

dayjs.extend(relativeTime);

const getRelativeTime = (
	timestamp: string | number | Date | null | undefined,
): string => {
	const parsed = timestamp != null ? dayjs(timestamp) : null;
	return parsed?.isValid() ? parsed.fromNow() : '—';
};

const hasCacheValue = (value: number | null | undefined): value is number =>
	typeof value === 'number' && value > 0;

// ─── Input helpers ───────────────────────────────────────────────────────────

export const parsePricingAmount = (raw: string): number | null => {
	if (raw.trim() === '') {
		return null;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
};

// ─── Display helpers ─────────────────────────────────────────────────────────

export const formatPricePerMillion = (value: number | undefined): string => {
	if (value === undefined || value === null) {
		return '—';
	}
	// 2dp is enough for per-1M pricing. we can update this later we models have sub-cent pricing.
	return `$${value.toFixed(2)}`;
};

export const getExtraBuckets = (rule: PricingRule): ExtraBucket[] => {
	const cache = rule.pricing?.cache;
	if (!cache) {
		return [];
	}
	const buckets: ExtraBucket[] = [];
	if (hasCacheValue(cache.read)) {
		buckets.push({ key: 'cache_read', pricePerMillion: cache.read });
	}
	if (hasCacheValue(cache.write)) {
		buckets.push({ key: 'cache_write', pricePerMillion: cache.write });
	}
	return buckets;
};

export const getSourceLabel = (rule: PricingRule): 'Auto' | 'User override' =>
	rule.isOverride ? 'User override' : 'Auto';

export const getRelativeLastSeen = (rule: PricingRule): string =>
	getRelativeTime(rule.updatedAt || rule.syncedAt || rule.createdAt);

// Canonical id shown under the model name, e.g. "openai:gpt-4o". Both segments
// are lower-cased so the id is consistently normalised (providers/models can
// arrive with mixed casing).
export const getCanonicalId = (rule: PricingRule): string => {
	const provider = rule.provider?.trim().toLowerCase() || 'unknown';
	const model = rule.modelName?.trim().toLowerCase() || 'unknown';
	return `${provider}:${model}`;
};

// ─── Drawer draft <-> API helpers ────────────────────────────────────────────

export const draftFromRule = (rule: PricingRule): DrawerDraft => ({
	id: rule.id,
	sourceId: rule.sourceId ?? null,
	modelName: rule.modelName,
	provider: rule.provider,
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

const buildCacheCosts = (
	pricing: DrawerDraft['pricing'],
): LlmpricingruletypesLLMPricingCacheCostsDTO | undefined => {
	const { cacheMode, cacheRead, cacheWrite } = pricing;
	if (!hasCacheValue(cacheRead) && !hasCacheValue(cacheWrite)) {
		return undefined;
	}
	return {
		mode: cacheMode,
		...(hasCacheValue(cacheRead) && { read: cacheRead }),
		...(hasCacheValue(cacheWrite) && { write: cacheWrite }),
	};
};

export const buildPricingPayload = (
	draft: DrawerDraft,
): LlmpricingruletypesLLMRulePricingDTO => {
	const cache = buildCacheCosts(draft.pricing);
	return {
		input: draft.pricing.input ?? 0,
		output: draft.pricing.output ?? 0,
		...(cache && { cache }),
	};
};

export const buildRulePayload = (
	draft: DrawerDraft,
): LlmpricingruletypesUpdatableLLMPricingRuleDTO => ({
	id: draft.id || undefined,
	sourceId: draft.sourceId || undefined,
	modelName: draft.modelName.trim(),
	provider: draft.provider.trim(),
	modelPattern: draft.patterns,
	isOverride: draft.isOverride,
	enabled: true,
	unit: UnitDTO.per_million_tokens,
	pricing: buildPricingPayload(draft),
});

export const validateModelName = (
	modelName: string,
	mode: DrawerMode,
): true | string =>
	mode === 'add' && !modelName.trim() ? 'Billing model ID is required.' : true;

export const validateProvider = (provider: string): true | string =>
	provider.trim() ? true : 'Provider is required.';

export const validatePricing = (
	pricing: DrawerDraft['pricing'],
	isOverride: boolean,
): true | string => {
	if (!isOverride) {
		return true;
	}
	if (pricing.input === null || pricing.input <= 0) {
		return 'Input cost must be greater than 0.';
	}
	if (pricing.output === null || pricing.output <= 0) {
		return 'Output cost must be greater than 0.';
	}
	if ((pricing.cacheRead ?? 0) < 0 || (pricing.cacheWrite ?? 0) < 0) {
		return 'Cache costs must be non-negative.';
	}
	return true;
};
