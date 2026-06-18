import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { CacheBucketDef, DrawerDraft } from './types';

// Page size for the model-cost list request / pagination.
export const PAGE_SIZE = 20;

// URL query-param key backing the current page.
export const PAGE_KEY = 'page';

// Number of columns in ModelCostsTable — used as the empty/loading row colSpan.
// Keep in sync with the <TableHead> count in ModelCostsTable.
export const COLUMN_COUNT = 8;

// Number of skeleton rows shown while the first page is loading.
export const SKELETON_ROW_COUNT = 5;

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
