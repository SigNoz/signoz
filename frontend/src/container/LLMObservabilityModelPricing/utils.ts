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

// Relative, human-readable distance from now (e.g. "2 days ago"); "—" for
// missing/invalid timestamps.
const getRelativeTime = (
	timestamp: string | number | Date | null | undefined,
): string => {
	const parsed = timestamp != null ? dayjs(timestamp) : null;
	return parsed?.isValid() ? parsed.fromNow() : '—';
};

const hasCacheValue = (value: number | null): boolean =>
	typeof value === 'number' && value > 0;

// ─── Input helpers ───────────────────────────────────────────────────────────

// Parses a price input's raw string. Empty → null (used by optional buckets),
// otherwise a finite number (NaN coerced to 0).
export const parsePricingAmount = (raw: string): number | null => {
	if (raw.trim() === '') {
		return null;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
};

// ─── Display helpers ─────────────────────────────────────────────────────────

// Pricing fields are typed as required numbers, but guard null/undefined
// anyway — API responses don't always honour the spec, and toFixed() on a
// missing value would crash the row instead of showing "—".
export const formatPricePerMillion = (value: number | undefined): string => {
	if (value === undefined || value === null) {
		return '—';
	}
	// We can keep it simple and just show two decimal places. but yes onces we have real data. we can increase the precision to 3 or 4 decimal places. For now, we can keep it simple and just show two decimal places.
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

export const getRelativeLastSeen = (rule: PricingRule): string =>
	getRelativeTime(rule.updatedAt || rule.syncedAt || rule.createdAt);

// Canonical id shown under the model name, e.g. "openai:gpt-4o". Both segments
// are lower-cased so the id is consistently normalised (providers/models can
// arrive with mixed casing).
export const getCanonicalId = (rule: PricingRule): string => {
	const provider = rule.provider?.trim().toLowerCase() || 'unknown';
	return `${provider}:${rule.modelName.toLowerCase()}`;
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

const buildCacheCosts = (
	pricing: DrawerDraft['pricing'],
): LlmpricingruletypesLLMPricingCacheCostsDTO | undefined => {
	const { cacheMode, cacheRead, cacheWrite } = pricing;
	if (!hasCacheValue(cacheRead) && !hasCacheValue(cacheWrite)) {
		return undefined;
	}
	return {
		mode: cacheMode,
		...(hasCacheValue(cacheRead) && { read: cacheRead as number }),
		...(hasCacheValue(cacheWrite) && { write: cacheWrite as number }),
	};
};

export const buildPricingPayload = (
	draft: DrawerDraft,
): LlmpricingruletypesLLMRulePricingDTO => {
	const cache = buildCacheCosts(draft.pricing);
	return {
		input: draft.pricing.input,
		output: draft.pricing.output,
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
	modelPattern:
		draft.patterns.length > 0 ? draft.patterns : [draft.modelName.trim()],
	isOverride: draft.isOverride,
	enabled: true,
	unit: UnitDTO.per_million_tokens,
	pricing: buildPricingPayload(draft),
});

// Field validators follow react-hook-form's `validate` convention: return
// `true` when valid, or the error message string when invalid.

// Billing model ID is only user-entered when adding; in edit mode it's
// immutable, so there's nothing to require.
export const validateModelName = (
	modelName: string,
	mode: DrawerMode,
): true | string =>
	mode === 'add' && !modelName.trim() ? 'Billing model ID is required.' : true;

export const validateProvider = (provider: string): true | string =>
	provider.trim() ? true : 'Provider is required.';

// Pricing is only user-entered for overrides; auto-populated rules are managed
// by SigNoz (and may legitimately be 0 for self-hosted models). `!(x > 0)`
// (rather than `x <= 0`) so NaN counts as invalid.
export const validatePricing = (
	pricing: DrawerDraft['pricing'],
	isOverride: boolean,
): true | string => {
	if (!isOverride) {
		return true;
	}
	if (!(pricing.input > 0)) {
		return 'Input cost must be greater than 0.';
	}
	if (!(pricing.output > 0)) {
		return 'Output cost must be greater than 0.';
	}
	if ((pricing.cacheRead ?? 0) < 0 || (pricing.cacheWrite ?? 0) < 0) {
		return 'Cache costs must be non-negative.';
	}
	return true;
};
