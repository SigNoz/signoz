/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesSpanMapperGroupConditionDTO } from './spantypesSpanMapperGroupConditionDTO';
import type { SpantypesSpanMapperOriginDTO } from './spantypesSpanMapperOriginDTO';

export interface SpantypesSpanMapperGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
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
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	origin: SpantypesSpanMapperOriginDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
	/**
	 * @type integer
	 */
	version: number;
}
