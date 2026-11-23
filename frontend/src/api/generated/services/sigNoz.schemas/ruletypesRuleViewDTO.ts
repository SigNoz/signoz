/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesRuleViewDataDTO } from './ruletypesRuleViewDataDTO';

export interface RuletypesRuleViewDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	data: RuletypesRuleViewDataDTO;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
