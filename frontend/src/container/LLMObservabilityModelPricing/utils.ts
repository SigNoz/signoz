import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import type { ExtraBucket, PricingRule } from './types';

dayjs.extend(relativeTime);

const lc = (value: string): string => value.toLowerCase();

// Relative, human-readable distance from now (e.g. "2 days ago"); "—" for
// missing/invalid timestamps.
const getRelativeTime = (
	timestamp: string | number | Date | null | undefined,
): string => {
	const parsed = timestamp != null ? dayjs(timestamp) : null;
	return parsed?.isValid() ? parsed.fromNow() : '—';
};

// ─── Display helpers ─────────────────────────────────────────────────────────

// Pricing fields are typed as required numbers, but guard null/undefined
// anyway — API responses don't always honour the spec, and toFixed() on a
// missing value would crash the row instead of showing "—".
export const formatPricePerMillion = (value: number | undefined): string => {
	if (value === undefined || value === null) {
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

export const getRelativeLastSeen = (rule: PricingRule): string =>
	getRelativeTime(rule.updatedAt || rule.syncedAt || rule.createdAt);

export const getCanonicalId = (rule: PricingRule): string => {
	const provider = rule.provider?.trim() || 'unknown';
	return `${lc(provider)}:${rule.modelName}`;
};
