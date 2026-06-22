import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { CacheBucketDef, DrawerDraft } from './types';

export const PAGE_SIZE = 20;

export const PAGE_KEY = 'page';
export const LIMIT_KEY = 'limit';
export const SEARCH_KEY = 'search';
export const SEARCH_DEBOUNCE_MS = 300;
export const SOURCE_KEY = 'source';

export type SourceFilter = 'all' | 'override' | 'auto';
export const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
	{ value: 'all', label: 'All sources' },
	{ value: 'override', label: 'User override' },
	{ value: 'auto', label: 'Auto' },
];

export const SOURCE_FILTER_TO_IS_OVERRIDE: Record<
	SourceFilter,
	boolean | undefined
> = {
	all: undefined,
	override: true,
	auto: false,
};

// Number of skeleton rows shown while the first page is loading.
export const SKELETON_ROW_COUNT = 10;

// The "Map to billing model" dropdown needs every rule in one shot (the unmapped
// tab isn't paginated), so the rule listing is fetched with a generous limit.
export const RULE_OPTIONS_LIMIT = 1000;

// URL-backed key for the active tab on the model-pricing page.
export const TAB_KEY = 'tab';
export const MODEL_COSTS_TAB = 'model-costs';
export const UNPRICED_MODELS_TAB = 'unpriced-models';

export const PROVIDER_OPTIONS = [
	{ value: 'OpenAI', label: 'OpenAI' },
	{ value: 'Anthropic', label: 'Anthropic' },
	{ value: 'Azure OpenAI', label: 'Azure OpenAI' },
	{ value: 'Google', label: 'Google' },
	{ value: 'Self-hosted', label: 'Self-hosted' },
	{ value: 'Other', label: 'Other' },
];

export const CACHE_MODE_OPTIONS = [
	{ value: CacheModeDTO.subtract, label: 'Subtract (OpenAI style)' },
	{ value: CacheModeDTO.additive, label: 'Additive (Anthropic style)' },
	{ value: CacheModeDTO.unknown, label: 'Unknown' },
];

// Optional buckets offered in the "Add pricing bucket" picker. Only the cache
// buckets are persisted by the API today (pricing.cache.read/write).
export const CACHE_BUCKETS: CacheBucketDef[] = [
	{ key: 'cacheRead', label: 'cache_read', testId: 'cache-read' },
	{ key: 'cacheWrite', label: 'cache_write', testId: 'cache-write' },
];

export const EMPTY_DRAFT: DrawerDraft = {
	id: null,
	sourceId: null,
	modelName: '',
	provider: 'OpenAI',
	patterns: [],
	isOverride: true,
	pricing: {
		input: null,
		output: null,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
	},
};
