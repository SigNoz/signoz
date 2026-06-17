import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

export interface ExtraBucket {
	key: string;
	pricePerMillion: number;
}

export interface ModelPricingFilters {
	page: number;
	setPage: (value: number) => void;
}
