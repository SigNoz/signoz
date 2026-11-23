/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { LlmpricingruletypesLLMPricingRuleCacheModeDTO } from './llmpricingruletypesLLMPricingRuleCacheModeDTO';

export interface LlmpricingruletypesLLMPricingCacheCostsDTO {
	mode: LlmpricingruletypesLLMPricingRuleCacheModeDTO;
	/**
	 * @type number
	 * @format double
	 */
	read?: number;
	/**
	 * @type number
	 * @format double
	 */
	write?: number;
}
