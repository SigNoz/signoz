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

// Match the page size so the skeleton reserves the same number of rows the
// loaded page renders — otherwise the table height jumps on load.
export const SKELETON_ROW_COUNT = PAGE_SIZE;

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
	// https://app.notion.com/p/signoz/LLM-Tokens-Cost-Calculation-330fcc6bcd19805283ccc841d596358e?source=copy_link#33efcc6bcd1980e6a187e442c6ba5996
	{ value: CacheModeDTO.unknown, label: 'Unknown' },
];

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
