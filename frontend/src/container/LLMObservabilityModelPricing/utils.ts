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
	SourceFilter,
	ValidationResult,
} from './types';

// Idempotent — relativeTime is also extended globally in utils/timeUtils.
dayjs.extend(relativeTime);

const lc = (value: string): string => value.toLowerCase();

const hasCacheValue = (value: number | null): boolean =>
	typeof value === 'number' && value > 0;

// ─── Display helpers ─────────────────────────────────────────────────────────

export const formatPricePerMillion = (value: number | undefined): string => {
	if (value === undefined || value === null || Number.isNaN(value)) {
		return '—';
	}
	return `$${value.toFixed(2)}`;
};

export const getExtraBuckets = (rule: PricingRule): ExtraBucket[] => {
	const cache = rule.pricing?.cache;
	if (!cache) {
		return [];
	}
	const buckets: ExtraBucket[] = [];
	if (typeof cache.read === 'number' && cache.read > 0) {
		buckets.push({ key: 'cache_read', pricePerMillion: cache.read });
	}
	if (typeof cache.write === 'number' && cache.write > 0) {
		buckets.push({ key: 'cache_write', pricePerMillion: cache.write });
	}
	return buckets;
};

export const getSourceLabel = (rule: PricingRule): 'Auto' | 'User override' =>
	rule.isOverride ? 'User override' : 'Auto';

export const getRelativeLastSeen = (rule: PricingRule): string => {
	const ts = rule.updatedAt || rule.syncedAt || rule.createdAt;
	const parsed = ts ? dayjs(ts) : null;
	return parsed?.isValid() ? parsed.fromNow() : '—';
};

export const filterRules = (
	rules: PricingRule[],
	search: string,
	source: SourceFilter,
): PricingRule[] => {
	const normalized = lc(search.trim());
	return rules.filter((rule) => {
		if (source === 'auto' && rule.isOverride) {
			return false;
		}
		if (source === 'override' && !rule.isOverride) {
			return false;
		}
		if (!normalized) {
			return true;
		}
		return (
			lc(rule.modelName).includes(normalized) ||
			lc(rule.provider).includes(normalized) ||
			(rule.modelPattern || []).some((pattern) => lc(pattern).includes(normalized))
		);
	});
};

export const getCanonicalId = (rule: PricingRule): string => {
	const provider = rule.provider?.trim() || 'unknown';
	return `${lc(provider)}:${rule.modelName}`;
};

// ─── Drawer draft <-> API helpers ────────────────────────────────────────────

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
	// Pricing is only user-entered for overrides; auto-populated rules are
	// managed by SigNoz (and may legitimately be 0 for self-hosted models).
	if (draft.isOverride) {
		if (!(draft.pricing.input > 0)) {
			return { ok: false, message: 'Input cost must be greater than 0.' };
		}
		if (!(draft.pricing.output > 0)) {
			return { ok: false, message: 'Output cost must be greater than 0.' };
		}
		if (
			(draft.pricing.cacheRead !== null && draft.pricing.cacheRead < 0) ||
			(draft.pricing.cacheWrite !== null && draft.pricing.cacheWrite < 0)
		) {
			return { ok: false, message: 'Cache costs must be non-negative.' };
		}
	}
	return { ok: true };
};
