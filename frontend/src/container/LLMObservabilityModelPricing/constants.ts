import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import type { DrawerDraft } from './types';

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

export const EMPTY_DRAFT: DrawerDraft = {
	id: null,
	sourceId: null,
	modelName: '',
	provider: 'OpenAI',
	patterns: [],
	isOverride: true,
	pricing: {
		input: 0,
		output: 0,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
	},
};
