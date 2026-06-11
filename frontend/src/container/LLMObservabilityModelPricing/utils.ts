import type { LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

export type SourceFilter = 'all' | 'auto' | 'override';

export interface ExtraBucket {
	key: string;
	pricePerMillion: number;
}

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

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export const getRelativeLastSeen = (rule: PricingRule): string => {
	const ts = rule.updatedAt || rule.syncedAt || rule.createdAt;
	if (!ts) {
		return '—';
	}
	const now = Date.now();
	const target = new Date(ts).getTime();
	if (Number.isNaN(target)) {
		return '—';
	}
	const seconds = Math.max(0, Math.round((now - target) / 1000));
	if (seconds < MINUTE) {
		return 'just now';
	}
	if (seconds < HOUR) {
		return `${Math.floor(seconds / MINUTE)} min ago`;
	}
	if (seconds < DAY) {
		return `${Math.floor(seconds / HOUR)} hr ago`;
	}
	if (seconds < MONTH) {
		return `${Math.floor(seconds / DAY)} days ago`;
	}
	if (seconds < YEAR) {
		return `${Math.floor(seconds / MONTH)} mo ago`;
	}
	return `${Math.floor(seconds / YEAR)} yr ago`;
};

const lc = (value: string): string => value.toLowerCase();

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
