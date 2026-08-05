import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	type LlmpricingruletypesLLMPricingRuleDTO,
	type LlmpricingruletypesUnmappedModelDTO,
} from 'api/generated/services/sigNoz.schemas';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

// A model seen in trace data (gen_ai.request.model) that no pricing rule matches.
export type UnpricedModel = LlmpricingruletypesUnmappedModelDTO;

export interface ExtraBucket {
	key: string;
	pricePerMillion: number;
}

export type DrawerMode = 'add' | 'edit';

// Optional pricing buckets the user can add/remove. Keyed by the matching
// DrawerDraft['pricing'] field.
export type CacheBucketKey = 'cacheRead' | 'cacheWrite';

export interface CacheBucketDef {
	key: CacheBucketKey;
	label: string;
	testId: string;
}

export interface DrawerDraft {
	id: string | null;
	sourceId: string | null;
	modelName: string;
	provider: string;
	patterns: string[];
	isOverride: boolean;
	enabled: boolean;
	pricing: {
		input: number | null;
		output: number | null;
		cacheMode: CacheModeDTO;
		cacheRead: number | null;
		cacheWrite: number | null;
	};
}
