/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { LlmpricingruletypesLLMPricingRuleUnitDTO } from './llmpricingruletypesLLMPricingRuleUnitDTO';
import type { LlmpricingruletypesLLMRulePricingDTO } from './llmpricingruletypesLLMRulePricingDTO';

export interface LlmpricingruletypesUpdatableLLMPricingRuleDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type boolean,null
	 */
	isOverride?: boolean | null;
	/**
	 * @type string
	 */
	modelName: string;
	/**
	 * @type array,null
	 */
	modelPattern: string[] | null;
	pricing: LlmpricingruletypesLLMRulePricingDTO;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string,null
	 */
	sourceId?: string | null;
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO;
}
