import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import type { ExtraBucket } from './types';
import type { LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

dayjs.extend(relativeTime);

const getRelativeTime = (
	timestamp: string | number | Date | null | undefined,
): string => {
	const parsed = timestamp != null ? dayjs(timestamp) : null;
	return parsed?.isValid() ? parsed.fromNow() : '—';
};

// ─── Display helpers ─────────────────────────────────────────────────────────

export const formatPricePerMillion = (value: number | undefined): string => {
	if (value === undefined || value === null) {
		return '—';
	}
	// 2dp is enough for per-1M pricing. we can update this later we models have sub-cent pricing.
	return `$${value.toFixed(2)}`;
};

export const getExtraBuckets = (
	rule: LlmpricingruletypesLLMPricingRuleDTO,
): ExtraBucket[] => {
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

export const getSourceLabel = (
	rule: LlmpricingruletypesLLMPricingRuleDTO,
): 'Auto' | 'User override' => (rule.isOverride ? 'User override' : 'Auto');

export const getRelativeLastSeen = (
	rule: LlmpricingruletypesLLMPricingRuleDTO,
): string => getRelativeTime(rule.updatedAt || rule.syncedAt || rule.createdAt);

// Canonical id shown under the model name, e.g. "openai:gpt-4o". Both segments
// are lower-cased so the id is consistently normalised (providers/models can
// arrive with mixed casing).
export const getCanonicalId = (
	rule: LlmpricingruletypesLLMPricingRuleDTO,
): string => {
	const provider = rule.provider?.trim().toLowerCase() || 'unknown';
	const model = rule.modelName?.trim().toLowerCase() || 'unknown';
	return `${provider}:${model}`;
};
