import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

import { TAB_KEYS } from './constants';

export type PricingRule = LlmpricingruletypesLLMPricingRuleDTO;

export type TabKey = (typeof TAB_KEYS)[number];

export interface ExtraBucket {
	key: string;
	pricePerMillion: number;
}
