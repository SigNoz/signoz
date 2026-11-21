/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { LlmpricingruletypesLLMPricingRuleUnitDTO } from './llmpricingruletypesLLMPricingRuleUnitDTO';
import type { LlmpricingruletypesLLMRulePricingDTO } from './llmpricingruletypesLLMRulePricingDTO';
import type { LlmpricingruletypesStringSliceDTO } from './llmpricingruletypesStringSliceDTO';

export interface LlmpricingruletypesLLMPricingRuleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isOverride: boolean;
	/**
	 * @type string
	 */
	modelName: string;
	modelPattern: LlmpricingruletypesStringSliceDTO | null;
	/**
	 * @type string
	 */
	orgId: string;
	pricing: LlmpricingruletypesLLMRulePricingDTO;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string
	 */
	sourceId?: string;
	/**
	 * @type string,null
	 * @format date-time
	 */
	syncedAt?: string | null;
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}
