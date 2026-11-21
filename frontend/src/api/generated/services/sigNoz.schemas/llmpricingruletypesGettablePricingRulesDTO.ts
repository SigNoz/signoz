/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { LlmpricingruletypesLLMPricingRuleDTO } from './llmpricingruletypesLLMPricingRuleDTO';

export interface LlmpricingruletypesGettablePricingRulesDTO {
	/**
	 * @type array,null
	 */
	items: LlmpricingruletypesLLMPricingRuleDTO[] | null;
	/**
	 * @type integer
	 */
	limit: number;
	/**
	 * @type integer
	 */
	offset: number;
	/**
	 * @type integer
	 */
	total: number;
}
