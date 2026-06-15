import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	type LlmpricingruletypesLLMPricingRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

export type SourceFilter = 'all' | 'auto' | 'override';

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
