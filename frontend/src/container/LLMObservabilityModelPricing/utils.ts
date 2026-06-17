import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import type { ExtraBucket, PricingRule } from './types';

// Idempotent — relativeTime is also extended globally in utils/timeUtils.
dayjs.extend(relativeTime);

const lc = (value: string): string => value.toLowerCase();

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

export const getCanonicalId = (rule: PricingRule): string => {
	const provider = rule.provider?.trim() || 'unknown';
	return `${lc(provider)}:${rule.modelName}`;
};
