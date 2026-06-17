import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	type ListLLMPricingRulesParams,
	type LlmpricingruletypesLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

export type SourceFilter = 'all' | 'auto' | 'override';

// List request params. Extends the generated (offset/limit) params with the
// search/source filters — backend support is pending, but sending them now
// keeps the page backend-driven so no FE change is needed once it lands.
export type ListModelPricingParams = ListLLMPricingRulesParams & {
	q?: string;
	source?: Exclude<SourceFilter, 'all'>;
};

export interface ExtraBucket {
	key: string;
	pricePerMillion: number;
}

export type DrawerMode = 'add' | 'edit';

export interface DrawerDraft {
	id: string | null;
	sourceId: string | null;
	modelName: string;
	provider: string;
	patterns: string[];
	isOverride: boolean;
	pricing: {
		input: number;
		output: number;
		cacheMode: CacheModeDTO;
		cacheRead: number | null;
		cacheWrite: number | null;
	};
}

export interface ValidationResult {
	ok: boolean;
	message?: string;
}
