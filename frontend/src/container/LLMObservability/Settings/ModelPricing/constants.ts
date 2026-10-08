import type { SelectItemType } from '@signozhq/ui/select';
import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { CacheBucketDef, DrawerDraft } from './types';

export const PAGE_SIZE = 20;

export const TOAST_MODEL_COST_ADDED = 'Model cost added';
export const TOAST_MODEL_COST_UPDATED = 'Model cost updated';
export const TOAST_MODEL_COST_DELETED = 'Model cost deleted';

export const PAGE_KEY = 'page';
export const LIMIT_KEY = 'limit';
export const SEARCH_KEY = 'search';
export const SEARCH_DEBOUNCE_MS = 300;
export const SOURCE_KEY = 'source';

export type SourceFilter = 'all' | 'override' | 'auto';
export const SOURCE_FILTER_OPTIONS: {
	type: 'item';
	value: SourceFilter;
	label: string;
}[] = [
	{ type: 'item', value: 'all', label: 'All sources' },
	{ type: 'item', value: 'override', label: 'User override' },
	{ type: 'item', value: 'auto', label: 'Auto' },
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

export const RULE_OPTIONS_LIMIT = 10;

// URL-backed key for the active tab on the model-pricing page.
export const TAB_KEY = 'tab';
export const MODEL_COSTS_TAB = 'model-costs';
export const UNPRICED_MODELS_TAB = 'unpriced-models';

export const PROVIDER_OPTIONS: SelectItemType[] = [
	{ type: 'item', value: 'OpenAI', label: 'OpenAI' },
	{ type: 'item', value: 'Anthropic', label: 'Anthropic' },
	{ type: 'item', value: 'Azure OpenAI', label: 'Azure OpenAI' },
	{ type: 'item', value: 'Google', label: 'Google' },
	{ type: 'item', value: 'Self-hosted', label: 'Self-hosted' },
	{ type: 'item', value: 'Other', label: 'Other' },
];

export const CACHE_MODE_OPTIONS: SelectItemType[] = [
	{
		type: 'item',
		value: CacheModeDTO.subtract,
		label: 'Subtract (OpenAI style)',
	},
	{
		type: 'item',
		value: CacheModeDTO.additive,
		label: 'Additive (Anthropic style)',
	},
	// https://app.notion.com/p/signoz/LLM-Tokens-Cost-Calculation-330fcc6bcd19805283ccc841d596358e?source=copy_link#33efcc6bcd1980e6a187e442c6ba5996
	{ type: 'item', value: CacheModeDTO.unknown, label: 'Unknown' },
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
	enabled: true,
	pricing: {
		input: null,
		output: null,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
	},
};
