import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { CacheBucketDef, DrawerDraft } from './types';

// Default page size for the model-cost list request / pagination.
export const PAGE_SIZE = 20;

// URL query-param keys backing the current page and page size. These match the
// keys passed to TanStackTable's `enableQueryParams`, so the table owns the
// writes while the tab reads them to build the list request.
export const PAGE_KEY = 'page';
export const LIMIT_KEY = 'limit';

// Number of skeleton rows shown while the first page is loading.
export const SKELETON_ROW_COUNT = 10;

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
